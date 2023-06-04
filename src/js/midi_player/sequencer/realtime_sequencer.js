import {MIDI} from "../../midi_parser/midi_loader.js";
import {Synthetizer} from "../synthetizer/synthetizer.js";
import {MidiRenderer} from "../../ui/midi_renderer.js";
import {getEvent, midiControllers, MidiMessage} from "../../midi_parser/midi_message.js";
import {formatTime} from "../../utils/other.js";

export class Sequencer {
    /**
     * Creates a new Midi sequencer for playing back MIDI file
     * @param parsedMidi {MIDI} The parsed midi
     * @param synth {Synthetizer} synth to send events to
     */
    constructor(parsedMidi, synth)
    {
        this.synth = synth;
        this.midiData = parsedMidi;

        if (!this.midiData.tracks) {
            throw "No tracks supplied!";
        }

        // event's number in this.events
        this.eventIndex = 0;

        /**
         * The (relative) time when the sequencer was paused. If it's not paused then it's undefined.
         * @type {number}
         */
        this.pausedTime = 0;

        /**
         * Absolute playback startTime, bases on the synth's time
         * @type {number}
         */
        this.absoluteStartTime = this.synth.currentTime;

        /**
         * Controls the playback's rate
         * @type {number}
         */
        this.playbackRate = 1;

        /**
         * merge the tracks
         * @type {MidiMessage[]}
         */
        this.events = this.midiData.tracks.flat();
        this.events.sort((e1, e2) => e1.ticks - e2.ticks);

        /**
         * Same as Audio.duration (seconds)
         * @type {number}
         */
        this.duration =this.ticksToSeconds(this.events[this.events.length - 1].ticks);

        console.log(`TOTAL TIME: ${formatTime(Math.round(this.duration)).time}`);
    }

    /**
     * @returns {number} Current playback time, in seconds
     */
    get currentTime()
    {
        // return the paused time if it's set to something other than undefined
        if(this.pausedTime)
        {
            return this.pausedTime;
        }
        return this.synth.currentTime - this.absoluteStartTime;
    }

    set currentTime(time)
    {
        this.stop();
        this.pausedTime = undefined;
        this.eventIndex = this.events.findIndex(e => this.ticksToSeconds(e.ticks) >= time);
        this.absoluteStartTime = this.synth.currentTime - time;
        this.play();
    }

    /**
     * Connects a midi renderer
     * @param renderer {MidiRenderer}
     */
    connectRenderer(renderer)
    {
        this.renderer = renderer;

        /**
         * Offset by rendere's note falling time
         * @type {number}
         */
        this.rendererEventIndex = 0;
    }

    /**
     * Pauses the playback
     */
    pause()
    {
        if(this.renderer)
        {
            this.renderer.pause();
        }
        if(this.paused)
        {
            console.warn("Already paused");
            return;
        }
        this.pausedTime = this.currentTime;
        this.stop();
    }

    /**
     * Coverts ticks to time in seconds
     * @param ticks {number}
     * @returns {number}
     */
    ticksToSeconds(ticks) {
        if (ticks <= 0) {
            return 0;
        }

        // find the last tempo change that has occured
        let tempo = this.midiData.tempoChanges.find(v => v.ticks < ticks);

        let timeSinceLastTempo = ticks - tempo.ticks;
        return this.ticksToSeconds(ticks - timeSinceLastTempo) + (timeSinceLastTempo * 60) / (tempo.tempo * this.midiData.timeDivision) * (1 / this.playbackRate);
    }

    /**
     * true if paused, false if playing or stopped
     * @returns {boolean}
     */
    get paused()
    {
        return this.pausedTime !== undefined;
    }

    /**
     * Starts the playback
     * @param resetTime {boolean} If true, time is set to 0
     */
    play(resetTime = false)
    {
        // unpause if paused
        if(this.paused)
        {
            // adjust the start time
            this.absoluteStartTime = this.synth.currentTime - this.pausedTime;
            this.pausedTime = undefined;
            if(this.renderer)
            {
                this.renderer.resume();
            }
        }

        // reset the time if necesarry
        if(resetTime) {
            this.currentTime = 0;
            return;
        }

        if(this.renderer)
        {
            this.renderer.clearNotes();
            this.rendererEventIndex = this.eventIndex;
        }

        // process every non note message from the start
        for(let i = 0; i < this.eventIndex; i++)
        {
            const event = this.events[i];
            const type = event.messageStatusByte >> 4;
            if(type === 0x8 || type === 0x9)
            {
                continue;
            }
            this._processEvent(event);
        }

        this.playbackInterval = setInterval(this._processTick.bind(this));
    }

    /**
     * Processes a single tick
     * @private
     */
    _processTick()
    {
        let event = this.events[this.eventIndex];
        while(this.ticksToSeconds(event.ticks) <= this.currentTime)
        {
            this._processEvent(event);
            ++this.eventIndex;

            if(this.eventIndex >= this.events.length)
            {
                this.currentTime = 0;
                return;
            }

            event = this.events[this.eventIndex];
        }

        if(this.renderer)
        {
            if(this.rendererEventIndex >= this.events.length)
            {
                return;
            }
            let event = this.events[this.rendererEventIndex];
            while(this.ticksToSeconds(event.ticks) <= this.currentTime + this.renderer.noteFallingSpeed / 1000)
            {
                this.rendererEventIndex++;
                event = this.events[this.rendererEventIndex - 1];

                const eventType = event.messageStatusByte >> 4;
                if(eventType !== 0x8 && eventType !== 0x9)
                {
                    continue;
                }

                const channel = event.messageStatusByte & 0x0F;
                const offset = this.renderer.noteFallingSpeed / 1000 -  (this.ticksToSeconds(event.ticks) - this.currentTime);
                if(eventType === 0x9 && event.messageData[1] > 0)
                {
                    this.renderer.startNoteFall(event.messageData[0], channel, offset * 1000);
                }
                else
                {
                    this.renderer.stopNoteFall(event.messageData[0], channel, offset * 1000);
                }
            }
        }
    }

    /**
     * Processes a single event
     * @param event {MidiMessage}
     * @private
     */
    _processEvent(event)
    {
        const statusByteData = getEvent(event.messageStatusByte);
        // process the event
        switch (statusByteData.name) {
            case "Note On":
                const velocity = event.messageData[1];
                if(velocity > 0) {
                    this.synth.NoteOn(statusByteData.channel, event.messageData[0], velocity);
                }
                else
                {
                    this.synth.NoteOff(statusByteData.channel, event.messageData[0]);
                }
                break;

            case "Note Off":
                this.synth.NoteOff(statusByteData.channel, event.messageData[0]);
                break;

            case "Pitch Bend":
                this.synth.pitchWheel(statusByteData.channel, event.messageData[1], event.messageData[0]);
                break;

            case "Controller Change":
                this.synth.controllerChange(statusByteData.channel, midiControllers[event.messageData[0]], event.messageData[1]);
                break;

            case "Program Change":
                this.synth.programChange(statusByteData.channel, event.messageData[0]);
                break;

            case "System Reset":
                this.synth.stopAll();
                console.log("System Reset");
                break;

            default:
                break;
        }
    }

    /**
     * Stops the playback
     */
    stop()
    {
        clearInterval(this.playbackInterval);
        this.playbackInterval = undefined;
        this.synth.stopAll();
    }
}