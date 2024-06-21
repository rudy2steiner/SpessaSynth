import {
    DEFAULT_PERCUSSION,
    Synthetizer,
    VOICE_CAP,
} from '../../../spessasynth_lib/synthetizer/synthetizer.js'
import { getDrumsSvg, getLoopSvg, getMuteSvg, getNoteSvg, getVolumeSvg } from '../icons.js'
import { ShiftableByteArray } from '../../../spessasynth_lib/utils/shiftable_array.js'
import { Meter } from './synthui_meter.js'
import { Selector } from './synthui_selector.js'
import { midiControllers } from '../../../spessasynth_lib/midi_parser/midi_message.js'
import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION
} from '../../../spessasynth_lib/synthetizer/worklet_system/worklet_utilities/worklet_message.js'


const LOCALE_PATH = "locale.synthesizerController.";
/**
 * synthesizer_ui.js
 * purpose: manages the graphical user interface for the synthesizer
 */

export class SynthetizerUI
{
    /**
     * Creates a new instance of synthetizer UI
     * @param colors {string[]}
     * @param element {HTMLElement} the element to create synthui in
     * @param localeManager {LocaleManager}
     */
    constructor(colors, element, localeManager) {
        this.channelColors = colors;
        const wrapper = element;
        this.uiDiv = document.createElement("div");
        this.uiDiv.classList.add("wrapper");
        wrapper.appendChild(this.uiDiv);
        this.uiDiv.style.visibility = "visible";
        this.isShown = false;
        this.locale = localeManager;
    }

    toggleDarkMode()
    {
        this.mainControllerDiv.classList.toggle("synthui_controller_light");
        this.mainButtons.forEach(b => {
            b.classList.toggle("synthui_button");
            b.classList.toggle("synthui_button_light");
        })

        this.mainMeters.forEach(meter => {
            meter.toggleMode(true);
        });

        this.controllers.forEach(controller => {
            controller.voiceMeter.toggleMode();
            controller.pitchWheel.toggleMode();
            controller.pan.toggleMode();
            controller.expression.toggleMode();
            controller.volume.toggleMode();
            controller.mod.toggleMode();
            controller.chorus.toggleMode();
            controller.preset.toggleMode();
            controller.presetReset.classList.toggle("voice_reset_light");
            controller.drumsToggle.classList.toggle("mute_button_light");
            controller.muteButton.classList.toggle("mute_button_light");
        })
    }

    /**
     * Connects the synth to UI
     * @param synth {Synthetizer}
     */
    connectSynth(synth)
    {
        this.synth = synth;

        this.getInstrumentList();

        this.createMainSynthController();
        this.createChannelControllers();

        document.addEventListener("keydown", e => {
            switch (e.key.toLowerCase())
            {
                case "s":
                    e.preventDefault();
                    const controller = this.uiDiv.getElementsByClassName("synthui_controller")[0];
                    controller.classList.toggle("synthui_controller_show");
                    controller.getElementsByClassName("controls_wrapper")[0].classList.toggle("controls_wrapper_show");
                    this.isShown = !this.isShown;
                    if(this.isShown)
                    {
                        this.showControllers();
                    }
                    else
                    {
                        this.hideControllers()
                    }
                    break;

                case "b":
                    e.preventDefault();
                    this.synth.highPerformanceMode = !this.synth.highPerformanceMode;
                    break;

                case "backspace":
                    e.preventDefault();
                    this.synth.stopAll(true);
                    break;
            }
        })

        // add event listener for locale change
        this.locale.onLocaleChanged.push(() => {
            // reload all meters
            // global meters
            this.voiceMeter.update(this.voiceMeter.currentValue, true);
            this.volumeController.update(this.volumeController.currentValue, true);
            this.panController.update(this.panController.currentValue, true);
            this.panController.update(this.panController.currentValue, true);
            this.transposeController.update(this.transposeController.currentValue, true);
            // channel controller meters
            for(const controller of this.controllers)
            {
                controller.voiceMeter.update(controller.voiceMeter.currentValue, true);
                controller.pitchWheel.update(controller.pitchWheel.currentValue, true);
                controller.pan.update(controller.pan.currentValue, true);
                controller.volume.update(controller.volume.currentValue, true);
                controller.expression.update(controller.expression.currentValue, true);
                controller.mod.update(controller.mod.currentValue, true);
                controller.chorus.update(controller.chorus.currentValue, true);
                controller.reverb.update(controller.reverb.currentValue, true);
                controller.transpose.update(controller.transpose.currentValue, true);
            }
        })
    }

    createMainSynthController()
    {
        // controls wrapper
        let controlsWrapper = document.createElement("div");
        controlsWrapper.classList.add("controls_wrapper");

        /**
         * Voice meter
         * @type {Meter}
         */
        this.voiceMeter = new Meter("#206",
            LOCALE_PATH + "mainVoiceMeter",
            this.locale,
            [],
            0,
            VOICE_CAP);
        this.voiceMeter.bar.classList.add("voice_meter_bar_smooth");

        /**
         * Volume controller
         * @type {Meter}
         */
        this.volumeController = new Meter("#206",
            LOCALE_PATH + "mainVolumeMeter",
            this.locale,
            [],
            0,
            100,
            true,
                v => {
            this.synth.setMainVolume(Math.round(v) / 100);
            this.volumeController.update(v);
        });
        this.volumeController.bar.classList.add("voice_meter_bar_smooth");
        this.volumeController.update(100);

        /**
         * Pan controller
         * @type {Meter}
         */
        this.panController = new Meter("#206",
            LOCALE_PATH + "mainPanMeter",
            this.locale,
            [],
            -1,
            1,
            true,
            v => {
            // use roland gs master pan
            this.synth.setMasterPan(v);
            this.panController.update(v);
        });
        this.panController.bar.classList.add("voice_meter_bar_smooth");
        this.panController.update(0);

        /**
         * Transpose controller
         * @type {Meter}
         */
        this.transposeController = new Meter("#206",
            LOCALE_PATH + "mainTransposeMeter",
            this.locale,
            [],
            -12,
            12,
            true,
                v => {
            // limit to half semitone precision
            this.synth.transpose(Math.round(v * 2 ) / 2);
            this.transposeController.update(Math.round(v * 2) / 2)
        });
        this.transposeController.bar.classList.add("voice_meter_bar_smooth");
        this.transposeController.update(0);

        // note killer
        let midiPanicButton = document.createElement("button");
        this.locale.bindObjectProperty(midiPanicButton, "textContent", LOCALE_PATH + "midiPanic.title");
        this.locale.bindObjectProperty(midiPanicButton, "title", LOCALE_PATH + "midiPanic.description");

        midiPanicButton.classList.add("synthui_button");
        midiPanicButton.onclick = () => this.synth.stopAll(true);

        let resetCCButton = document.createElement("button");
        this.locale.bindObjectProperty(resetCCButton, "textContent", LOCALE_PATH + "systemReset.title");
        this.locale.bindObjectProperty(resetCCButton, "title", LOCALE_PATH + "systemReset.description");

        resetCCButton.classList.add("synthui_button");
        resetCCButton.onclick = () => this.synth.resetControllers();

        // create the main controller now, to give the button a variable to work with
        let controller = document.createElement("div");
        controller.classList.add("synthui_controller");
        this.uiDiv.appendChild(controller);

        // channel controller shower
        let showControllerButton = document.createElement("button");
        this.locale.bindObjectProperty(showControllerButton, "textContent", LOCALE_PATH + "toggleButton.title");
        this.locale.bindObjectProperty(showControllerButton, "title", LOCALE_PATH + "toggleButton.description");
        showControllerButton.classList.add("synthui_button");
        showControllerButton.onclick = () => {
            controller.classList.toggle("synthui_controller_show");
            controlsWrapper.classList.toggle("controls_wrapper_show");
            this.isShown = !this.isShown;
            if(this.isShown)
            {
                this.showControllers();
            }
            else
            {
                this.hideControllers()
            }
        }

        // black midi mode toggle
        const highPerfToggle = document.createElement("button");
        this.locale.bindObjectProperty(highPerfToggle, "textContent", LOCALE_PATH + "blackMidiMode.title");
        this.locale.bindObjectProperty(highPerfToggle, "title", LOCALE_PATH + "blackMidiMode.description");

        highPerfToggle.classList.add("synthui_button");
        highPerfToggle.onclick = () => {
            this.synth.highPerformanceMode = !this.synth.highPerformanceMode;
        }

        // vibrato reset
        const vibratoReset = document.createElement("button");
        this.locale.bindObjectProperty(vibratoReset, "textContent", LOCALE_PATH + "disableCustomVibrato.title");
        this.locale.bindObjectProperty(vibratoReset, "title", LOCALE_PATH + "disableCustomVibrato.description");

        vibratoReset.classList.add("synthui_button");
        vibratoReset.onclick = () => {
            this.synth.lockAndResetChannelVibrato();
            vibratoReset.parentNode.removeChild(vibratoReset);
        }

        // meters
        controlsWrapper.appendChild(this.volumeController.div);
        controlsWrapper.appendChild(this.panController.div);
        controlsWrapper.appendChild(this.transposeController.div);
        // buttons
        controlsWrapper.appendChild(midiPanicButton);
        controlsWrapper.appendChild(resetCCButton);
        controlsWrapper.appendChild(highPerfToggle);
        controlsWrapper.appendChild(vibratoReset);

        /**
         * @type {Meter[]}
         */
        this.mainMeters = [
            this.volumeController,
            this.panController,
            this.transposeController,
            this.voiceMeter,
        ];
        /**
         * @type {HTMLElement[]}
         */
        this.mainButtons = [
            midiPanicButton,
            resetCCButton,
            highPerfToggle,
            vibratoReset,
            showControllerButton];
        // main synth div
        this.uiDiv.appendChild(this.voiceMeter.div);
        this.uiDiv.appendChild(showControllerButton);
        controller.appendChild(controlsWrapper);
        this.mainControllerDiv = controller;
    }

    createChannelControllers()
    {
        const dropdownDiv = this.uiDiv.getElementsByClassName("synthui_controller")[0];

        /**
         * @type {ChannelController[]}
         */
        this.controllers = [];
        for (let i = 0; i < this.synth.channelsAmount; i++)
        {
            const controller = this.createChannelController(i);
            this.controllers.push(controller);
            dropdownDiv.appendChild(controller.controller);
        }

        this.setEventListeners();

        setInterval(this.updateVoicesAmount.bind(this), 100);
        this.hideControllers();
    }

    /**
     * @typedef {{
     *     controller: HTMLDivElement,
     *     voiceMeter: Meter,
     *     pitchWheel: Meter,
     *     pan: Meter,
     *     expression: Meter,
     *     volume: Meter,
     *     mod: Meter,
     *     chorus: Meter,
     *     reverb: Meter,
     *     transpose: Meter,
     *     preset: Selector,
     *     presetReset: HTMLDivElement,
     *     drumsToggle: HTMLDivElement,
     *     muteButton: HTMLDivElement
     * }} ChannelController
     */

    /**
     * Creates a new channel controller js
     * @param channelNumber {number}
     * @returns {ChannelController}
     */
    createChannelController(channelNumber)
    {
        // controller
        const controller = document.createElement("div");
        controller.classList.add("channel_controller");

        // voice meter
        const voiceMeter = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            LOCALE_PATH + "channelController.voiceMeter",
            this.locale,
            [channelNumber + 1],
            0,
            100);
        voiceMeter.bar.classList.add("voice_meter_bar_smooth");
        controller.appendChild(voiceMeter.div);

        // pitch wheel
        const pitchWheel = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            LOCALE_PATH + "channelController.pitchBendMeter",
            this.locale,
            [channelNumber + 1],
            -8192,
            8192,
            true,
            val => {
                val = Math.round(val) + 8192;
                // get bend values
                const msb = val >> 7;
                const lsb = val & 0x7F;
                this.synth.pitchWheel(channelNumber, msb, lsb);
            });
        pitchWheel.update(0);
        controller.appendChild(pitchWheel.div);

        /**
         * @param cc {number}
         * @param val {number}
         * @param meter {Meter}
         */
        let changeCCUserFunction = (cc, val, meter) => {
            if(meter.isLocked)
            {
                this.synth.lockController(channelNumber, cc, false);
                this.synth.controllerChange(channelNumber, cc, val);
                this.synth.lockController(channelNumber, cc, true);
            }
            else {
                this.synth.controllerChange(channelNumber, cc, val);
            }
        }

        // pan controller
        const pan = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            LOCALE_PATH + "channelController.panMeter",
            this.locale,
            [channelNumber + 1],
            0,
            127,
            true,
            val => {
                changeCCUserFunction(midiControllers.pan, Math.round(val), pan);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.pan, true);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.pan, false);
            });
        pan.update(64);
        controller.appendChild(pan.div);

        // expression controller
        const expression = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            LOCALE_PATH + "channelController.expressionMeter",
            this.locale,
            [channelNumber + 1],
            0,
            127,
            true,
            val => {
                changeCCUserFunction(midiControllers.expressionController, Math.round(val), expression);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.expressionController, true);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.expressionController, false);
            });
        expression.update(127);
        controller.appendChild(expression.div);

        // volume controller
        const volume = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            LOCALE_PATH + "channelController.volumeMeter",
            this.locale,
            [channelNumber + 1],
            0,
            127,
            true,
            val => {
                changeCCUserFunction(midiControllers.mainVolume, Math.round(val), volume);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.mainVolume, true);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.mainVolume, false);
            });
        volume.update(100);
        controller.appendChild(volume.div);

        // modulation wheel
        const modulation = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            LOCALE_PATH + "channelController.modulationWheelMeter",
            this.locale,
            [channelNumber + 1],
            0,
            127,
            true,
            val => {
                changeCCUserFunction(midiControllers.modulationWheel, Math.round(val), modulation);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.modulationWheel, true);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.modulationWheel, false);
            });
        modulation.update(0);
        controller.appendChild(modulation.div);

        // chorus
        const chorus = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            LOCALE_PATH + "channelController.chorusMeter",
            this.locale,
            [channelNumber + 1],
            0,
            127,
            true,
            val => {
                changeCCUserFunction(midiControllers.effects3Depth, Math.round(val), chorus);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.effects3Depth, true);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.effects3Depth, false);
            });
        chorus.update(0);
        controller.appendChild(chorus.div);

        // reverb
        const reverb = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            LOCALE_PATH + "channelController.reverbMeter",
            this.locale,
            [channelNumber + 1],
            0,
            127,
            true,
            val => {
                changeCCUserFunction(midiControllers.effects1Depth, Math.round(val), reverb);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.effects1Depth, true);
            },
            () => {
                this.synth.lockController(channelNumber, midiControllers.effects1Depth, false);
            });
        reverb.update(40);
        controller.appendChild(reverb.div);

        // transpose
        const transpose = new Meter(this.channelColors[channelNumber % this.channelColors.length],
            LOCALE_PATH + "channelController.transposeMeter",
            this.locale,
            [channelNumber + 1],
            -36,
            36,
            true,
            val => {
                val = Math.round(val);
                this.synth.transposeChannel(channelNumber, val, true);
                transpose.update(val);
            });
        transpose.update(0);
        controller.appendChild(transpose.div);

        // create it here so we can use it in the callback function
        const presetReset = document.createElement("div");

        // preset controller
        const presetSelector = new Selector((
                []
            ),
            this.locale,
            LOCALE_PATH + "channelController.presetSelector.description",
            [channelNumber + 1],
            presetName => {
                const data = JSON.parse(presetName);
                this.synth.lockController(channelNumber, ALL_CHANNELS_OR_DIFFERENT_ACTION, false);
                this.synth.controllerChange(channelNumber, midiControllers.bankSelect, data[0]);
                this.synth.programChange(channelNumber, data[1], true);
                presetSelector.mainDiv.classList.add("locked_selector");
                this.synth.lockController(channelNumber, ALL_CHANNELS_OR_DIFFERENT_ACTION, true);
            }
        );
        controller.appendChild(presetSelector.mainDiv);

        // preset reset
        presetReset.innerHTML = getLoopSvg(32);
        this.locale.bindObjectProperty(presetReset, "title", LOCALE_PATH + "channelController.presetReset.description", [channelNumber + 1]);
        presetReset.classList.add("controller_element");
        presetReset.classList.add("voice_reset");
        presetReset.onclick = () => {
            this.synth.lockController(channelNumber, ALL_CHANNELS_OR_DIFFERENT_ACTION, false);
            presetSelector.mainDiv.classList.remove("locked_selector");
        }
        controller.appendChild(presetReset);

        // mute button
        const muteButton = document.createElement("div");
        muteButton.innerHTML = getVolumeSvg(32);
        this.locale.bindObjectProperty(muteButton, "title", LOCALE_PATH + "channelController.muteButton.description", [channelNumber + 1]);
        muteButton.classList.add("controller_element");
        muteButton.classList.add("mute_button");
        muteButton.onclick = () => {
            if(this.synth.channelProperties[channelNumber].isMuted)
            {
                this.synth.muteChannel(channelNumber, false);
                muteButton.innerHTML = getVolumeSvg(32);
            }
            else
            {
                this.synth.muteChannel(channelNumber, true);
                muteButton.innerHTML = getMuteSvg(32);
            }
        }
        controller.appendChild(muteButton);

        // drums toggle
        const drumsToggle = document.createElement("div");
        drumsToggle.innerHTML = channelNumber === DEFAULT_PERCUSSION ? getDrumsSvg(32) : getNoteSvg(32);
        this.locale.bindObjectProperty(drumsToggle, "title", LOCALE_PATH + "channelController.drumToggleButton.description", [channelNumber + 1]);
        drumsToggle.classList.add("controller_element");
        drumsToggle.classList.add("mute_button");
        drumsToggle.onclick = () => {
            // correct the channel number
            const sysexChannelNumber = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 10, 11, 12, 13, 14, 15][channelNumber];
            this.synth.systemExclusive(new ShiftableByteArray([ // roland gs drum sysex
                0x41, // roland
                0x10, // device id (doesn't matter, really)
                0x42, // gs
                0x12,
                0x40, // drums
                0x10 | sysexChannelNumber,
                0x15, /// drums
                this.synth.channelProperties[channelNumber].isDrum ? 0x00 : 0x01,
                0x11,
                0xF7
            ]));
        }
        controller.appendChild(drumsToggle);

        return {
            controller: controller,
            voiceMeter: voiceMeter,
            pitchWheel: pitchWheel,
            pan: pan,
            expression: expression,
            volume: volume,
            mod: modulation,
            chorus: chorus,
            reverb: reverb,
            preset: presetSelector,
            presetReset: presetReset,
            drumsToggle: drumsToggle,
            muteButton: muteButton,
            transpose: transpose
        };

    }

    updateVoicesAmount()
    {
        this.voiceMeter.update(this.synth.voicesAmount);

        this.controllers.forEach((controller, i) => {
            // update channel
            let voices = this.synth.channelProperties[i].voicesAmount;
            controller.voiceMeter.update(voices);
            if(voices < 1 && this.synth.voicesAmount > 0)
            {
                controller.controller.classList.add("no_voices");
            }
            else
            {
                controller.controller.classList.remove("no_voices");
            }
        });
    }

    setEventListeners()
    {
        const dropdownDiv = this.uiDiv.getElementsByClassName("synthui_controller")[0];
        // add event listeners
        this.synth.eventHandler.addEvent("programchange", "synthui-program-change", e =>
        {
            this.controllers[e.channel].preset.set(JSON.stringify([e.bank, e.program]));
        });

        this.synth.eventHandler.addEvent("allcontrollerreset", "synthui-all-controller-reset", () => {
            for (const controller of this.controllers) {
                controller.pan.update(64);
                controller.mod.update(0);
                controller.chorus.update(0);
                controller.pitchWheel.update(0);
                controller.expression.update(127);
                controller.volume.update(100);
                controller.reverb.update(40);
            }
        });

        this.synth.eventHandler.addEvent("controllerchange", "synthui-controller-change",e => {
            const controller = e.controllerNumber;
            const channel = e.channel;
            const value = e.controllerValue;
            switch (controller)
            {
                default:
                    break;

                case midiControllers.expressionController:
                    // expression
                    this.controllers[channel].expression.update(value);
                    break;

                case midiControllers.mainVolume:
                    // volume
                    this.controllers[channel].volume.update(value);
                    break;

                case midiControllers.pan:
                    // pan
                    this.controllers[channel].pan.update(value);
                    break;

                case midiControllers.modulationWheel:
                    // mod wheel
                    this.controllers[channel].mod.update(value);
                    break;

                case midiControllers.effects3Depth:
                    // chorus
                    this.controllers[channel].chorus.update(value);
                    break;

                case midiControllers.effects1Depth:
                    // reverb
                    this.controllers[channel].reverb.update(value);
            }
        });

        this.synth.eventHandler.addEvent("pitchwheel", "synthui-pitch-wheel", e => {
            const val = (e.MSB << 7) | e.LSB;
            // pitch wheel
            this.controllers[e.channel].pitchWheel.update(val - 8192);
        });

        this.synth.eventHandler.addEvent("drumchange", "synthui-drum-change", e => {
            this.controllers[e.channel].drumsToggle.innerHTML = (e.isDrumChannel ? getDrumsSvg(32) : getNoteSvg(32));
            this.controllers[e.channel].preset.reload(e.isDrumChannel ? this.percussionList : this.instrumentList);
        });

        this.synth.eventHandler.addEvent("newchannel", "synthui-new-channel", () => {
            const controller = this.createChannelController(this.controllers.length);
            this.controllers.push(controller);
            dropdownDiv.appendChild(controller.controller);
            this.hideControllers();
        });
    }

    hideControllers()
    {
        this.controllers.forEach(c => {
            c.voiceMeter.hide();
            c.pitchWheel.hide();
            c.pan.hide();
            c.expression.hide();
            c.volume.hide();
            c.mod.hide();
            c.chorus.hide();
            c.preset.hide();
        })
    }
    showControllers()
    {
        this.controllers.forEach(c => {
            c.voiceMeter.show();
            c.pitchWheel.show();
            c.pan.show();
            c.expression.show();
            c.volume.show();
            c.mod.show();
            c.chorus.show();
            c.preset.show();
        })
    }

    getInstrumentList()
    {
        this.synth.eventHandler.addEvent("presetlistchange", "synthui-preset-list-change", e => {
            /**
             * @type {PresetListElement[]}
             */
            const presetList = e;
            /**
             * @type {{name: string, program: number, bank: number}[]}
             */
            this.instrumentList = presetList.filter(p => p.bank !== 128)
                .sort((a, b) => {
                    if(a.program === b.program)
                    {
                        return a.bank - b.bank;
                    }
                    return a.program - b.program;
                })
                .map(p => {
                    return {
                        name: p.presetName,
                        bank: p.bank,
                        program: p.program
                    };
                });

            /**
             * @type {{name: string, program: number, bank: number}[]}
             */
            this.percussionList = presetList.filter(p => p.bank === 128)
                .sort((a, b) => a.program - b.program)
                .map(p => {
                    return {
                        name: p.presetName,
                        bank: p.bank,
                        program: p.program
                    };
                });

            if(this.percussionList.length === 0)
            {
                this.percussionList.push(this.instrumentList[0])
            }

            this.controllers.forEach((controller, i) => {
                const list = this.synth.channelProperties[i].isDrum ? this.percussionList : this.instrumentList;
                controller.preset.reload(list);
                controller.preset.set(JSON.stringify([list[0].bank, list[0].program]))
            });
        });
    }
}