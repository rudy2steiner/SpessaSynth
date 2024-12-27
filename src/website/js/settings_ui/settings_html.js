/**
 * settings_html.js
 * purpose: the inner html for the settings element
 */
import { USE_MIDI_RANGE } from "./handlers/keyboard_handler.js";

// translate-path: only innerText: translate-path-title: inner text by adding .title and title by adding .description
export const settingsHtml = `
<p translate-path='locale.settings.mainTitle'></p>
<div class='settings_groups_parent'>
    <div class='settings_group'>
        <p translate-path='locale.settings.rendererSettings.title'></p>
        <label translate-path-title='locale.settings.rendererSettings.noteFallingTime'></label>
        <spessarange min='1' max='9999' value='1000' class='settings_slider' input_id='note_time_slider' units='ms'></spessarange>
        
        <label translate-path-title='locale.settings.rendererSettings.waveformThickness'></label>
        <spessarange min='0' max='10' value='2' class='settings_slider' input_id='analyser_thickness_slider' units='px'></spessarange>
        
        <label 
        translate-path-title='locale.settings.rendererSettings.waveformSampleSize'></label>
        <spessarange min='5' max='15' value='10' class='settings_slider' input_id='analyser_fft_slider' units=''></spessarange>
        
        <label translate-path-title='locale.settings.rendererSettings.waveformAmplifier'></label>
        <spessarange min='-10' max='10' value='2' class='settings_slider' input_id='wave_multiplier_slider' units=''></spessarange>
        
        <div class='switch_label'>
            <label for='analyser_toggler' translate-path-title='locale.settings.rendererSettings.toggleWaveformsRendering'></label>
            <label class='switch'>
                <input type='checkbox' checked id='analyser_toggler'>
                <span class='switch_slider'></span>
            </label>
        </div>
        
        <div class='switch_label'>
            <label for='note_toggler' translate-path-title='locale.settings.rendererSettings.toggleNotesRendering'></label>
            <label class='switch'>
                <input type='checkbox' checked id='note_toggler'>
                <span class='switch_slider'></span>
            </label>
        </div>
        
        <div class='switch_label'>
            <label for='active_note_toggler' translate-path-title='locale.settings.rendererSettings.toggleDrawingActiveNotes'></label>
            <label class='switch'>
                <input type='checkbox' checked id='active_note_toggler'>
                <span class='switch_slider'></span>
            </label>
        </div>
        
        <div class='switch_label'>
            <label for='visual_pitch_toggler' translate-path-title='locale.settings.rendererSettings.toggleDrawingVisualPitch'></label>
            <label class='switch'>
                <input type='checkbox' checked id='visual_pitch_toggler'>
                <span class='switch_slider'></span>
            </label>
        </div>
        
        <div class='switch_label'>
            <label for='stabilize_waveforms_toggler' translate-path-title='locale.settings.rendererSettings.toggleStabilizeWaveforms'></label>
            <label class='switch'>
                <input type='checkbox' checked id='stabilize_waveforms_toggler'>
                <span class='switch_slider'></span>
            </label>
        </div>
    </div>


    <div class='settings_group'>
        <p translate-path='locale.settings.keyboardSettings.title'></p>
        <label for='channel_selector' translate-path-title='locale.settings.keyboardSettings.selectedChannel'></label>
        <select id='channel_selector'>
        </select>
        
        <label for='keyboard_size_selector' translate-path-title='locale.settings.keyboardSettings.keyboardSize'></label>
        <select id='keyboard_size_selector'>
            <option value='full' translate-path='locale.settings.keyboardSettings.keyboardSize.full'></option>
            <option value='piano' translate-path='locale.settings.keyboardSettings.keyboardSize.piano'></option>
            <option value='5 octaves' translate-path='locale.settings.keyboardSettings.keyboardSize.fiveOctaves'></option>
            <option value='two octaves' translate-path='locale.settings.keyboardSettings.keyboardSize.twoOctaves'></option>
            <option value='${USE_MIDI_RANGE}' translate-path='locale.settings.keyboardSettings.keyboardSize.useSongKeyRange'></option>
        </select>
        
        <div class='switch_label'>
            <label translate-path-title='locale.settings.keyboardSettings.toggleTheme'></label>
            <label class='switch'>
                <input type='checkbox' id='mode_selector'>
                <span class='switch_slider'></span>
            </label>
        </div>
        <div class='switch_label'>
            <label translate-path-title='locale.settings.keyboardSettings.show'></label>
            <label class='switch'>
                <input type='checkbox' checked id='keyboard_show'>
                <span class='switch_slider'></span>
            </label>
        </div>
    </div>
    
    
    <div class='settings_group' id='midi_settings'>
        <p translate-path='locale.settings.midiSettings.title'></p>
        <label for='midi_input_selector' translate-path-title='locale.settings.midiSettings.midiInput'></label>
        <select id='midi_input_selector'>
            <option value='-1' translate-path='locale.settings.midiSettings.midiInput.disabled'></option>
        </select>
        
        <label for='midi_output_selector' translate-path-title='locale.settings.midiSettings.midiOutput'></label>
        <select id='midi_output_selector'>
            <option value='-1' translate-path='locale.settings.midiSettings.midiOutput.disabled'></option>
        </select>
    </div>
    
    
    <div class='settings_group'>
        <p translate-path='locale.settings.interfaceSettings.title'></p>
        <div class='switch_label'>
            <label translate-path-title='locale.settings.interfaceSettings.toggleTheme'></label>
            <label class='switch'>
                <input type='checkbox' checked id='toggle_mode_button'>
                <span class='switch_slider'></span>
            </label>
        </div>
        
        <label for='language_selector' translate-path-title='locale.settings.interfaceSettings.selectLanguage'></label>
        <select id='language_selector'>
         <option value='help-translate' translate-path='locale.settings.interfaceSettings.selectLanguage.helpTranslate'></option>
        <!-- will be added via javascript -->
        </select>
        
        <label for='layout_selector' translate-path-title='locale.settings.interfaceSettings.layoutDirection'></label>
        <select id='layout_selector'>
            <option value='downwards' selected translate-path='locale.settings.interfaceSettings.layoutDirection.values.downwards'></option>
            <option value='upwards' translate-path='locale.settings.interfaceSettings.layoutDirection.values.upwards'></option>
            <option value='left' translate-path='locale.settings.interfaceSettings.layoutDirection.values.leftToRight'></option>
            <option value='right' translate-path='locale.settings.interfaceSettings.layoutDirection.values.rightToLeft'></option>
        </select>
        
        <p><a href='https://github.com/spessasus/SpessaSynth/wiki/How-To-Use-App' target='_blank' translate-path-title='locale.synthesizerController.helpButton'></a></p>
        
        <p class='hover_reminder' translate-path-title='locale.settings.interfaceSettings.reminder'></p>
    </div>
</div>
`;