import { getDoubleNoteSvg } from './icons.js'
import { formatTime } from '../../spessasynth_lib/utils/other.js'

export class PlayerUI{
    /**
     * Creates a new class for displaying information about the current file.
     * @param element {HTMLElement}
     */
    constructor(element) {
        this.mainDiv = element;
        this.mainDiv.innerHTML = `
        <div class='player_info_wrapper'>
            <div class="player_info_note_icon">
                ${getDoubleNoteSvg("100%")}
            </div>
            <div class='player_info_details'>
                <h1 id='player_info_title'>Nothing is playing</h1>
                <h3 id='player_info_detail'>Upload a MIDI!</h3>
                <h3 id='player_info_time'></h3>
            </div>
        </div>`;

    }

    /**
     * @param seq {Sequencer}
     */
    connectSequencer(seq)
    {
        this.seq = seq;
        this.seq.addOnSongChangeEvent(mid => {
            // get the title
            let title;
            if(mid.midiName.length > 0)
            {
                title = mid.midiName;
            }
            else
            {
                title =  mid.fileName;
            }
            document.getElementById("player_info_title").innerText = title;
            document.getElementById("player_info_detail").innerText = mid.fileName;
            document.getElementById("player_info_time").innerText = formatTime(this.seq.duration).time;
        }, "player-ui-song-change");
    }

    togglevisibility()
    {
        this.mainDiv.classList.toggle("player_info_show");
    }
}