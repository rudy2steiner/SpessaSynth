/**
 *                    __  __
 *      /\           |  \/  |
 *     /  \   ___ ___| \  / | __ _ _ __   __ _  __ _  ___ _ __
 *    / /\ \ / __/ __| |\/| |/ _` | '_ \ / _` |/ _` |/ _ \ '__|
 *   / ____ \\__ \__ \ |  | | (_| | | | | (_| | (_| |  __/ |
 *  /_/    \_\___/___/_|  |_|\__,_|_| |_|\__,_|\__, |\___|_|
 *                                              __/ |
 *                                             |___/
 * Advanced SubStation manager.
 * That's that ASS stands for.
 * Nothing suspicious here.
 */

const DEFAULT_RES_X = 384;
const DEFAULT_RES_Y = 288;

function ASStimeToFloat(timeString)
{
    const [hours, minutes, seconds] = timeString.split(":");
    const [sec, hundredths] = seconds.split(".");
    return (parseInt(hours) * 3600) + (parseInt(minutes) * 60) + parseInt(sec) + (parseInt(hundredths) / 100);
}

function splitByCurlyBraces(input)
{
    // Regular expression to match everything inside curly braces and also separate out text outside them
    const regex = /(\{[^}]*}|[^{}]+)/g;
    return input.match(regex);
}

export class SubContent
{
    /**
     * For example "Dialogue"
     * @type {string}
     */
    type;
    /**
     * for example: "0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Normal text."
     * @type {string}
     */
    data;
}

export class SubSection
{
    /**
     * The section type, like [Events]
     * @type {string}
     */
    type;
    
    /**
     * The section contents
     * @type {SubContent[]}
     */
    contents = [];
    
    /**
     * @param type {string}
     * @param contents {SubContent[]}
     */
    constructor(type, contents)
    {
        this.type = type;
        this.contents = contents;
    }
    
    /**
     * @param type {string}
     * @param fallback {string}
     * @return {string}
     */
    getContent(type, fallback = "")
    {
        return this.contents.find(c => c.type === type)?.data || fallback;
    }
}

class DialogueEvent
{
    /**
     * @type {string[]}
     */
    text = [];
    
    /**
     * @type {number}
     */
    layer = 0;
    
    /**
     * @type {number}
     */
    startSeconds = 0;
    
    /**
     * @type {number}
     */
    endSeconds = 0;
    
    /**
     * @type {string}
     */
    styleName = "";
    
    /**
     * @type {number}
     */
    marginLeft = 0;
    
    /**
     * @type {number}
     */
    marginRight = 0;
    
    /**
     * @type {number}
     */
    marginVertical = 0;
    
    
    constructor(text, layer, startSeconds, endSeconds, styleName, marginLeft, marginRight, marginVertical)
    {
        this.text = splitByCurlyBraces(text);
        this.layer = layer;
        this.startSeconds = startSeconds;
        this.endSeconds = endSeconds;
        this.styleName = styleName;
        this.marginLeft = marginLeft;
        this.marginRight = marginRight;
        this.marginVertical = marginVertical;
    }
}

export class AssManager
{
    /**
     * @type boolean
     */
    visible;
    /**
     * @type {SubSection[]}
     */
    subData = [];
    
    /**
     * @type {number}
     */
    resolutionX = DEFAULT_RES_X;
    /**
     * @type {number}
     */
    resolutionY = DEFAULT_RES_Y;
    /**
     * @type {boolean}
     */
    kerning = true;
    /**
     * @type {Object<string, string>[]}
     */
    styles = [];
    /**
     * @type {DialogueEvent[]}
     */
    events = [];
    
    /**
     * Multiplier: 1 is normal speed
     * @type {number}
     */
    timer = 1;
    
    /**
     * Creates a new subtitle manager
     * @param seq {Sequencer}
     * @param screen {HTMLDivElement}
     */
    constructor(seq, screen)
    {
        this.seq = seq;
        this.screen = screen;
        this.init();
    }
    
    init()
    {
        this.visible = false;
        this.subData = [];
        this.resolutionX = DEFAULT_RES_X;
        this.resolutionY = DEFAULT_RES_Y;
        this.kerning = true;
        this.styles = [];
        this.events = [];
    }
    
    /**
     * @param visible {boolean}
     */
    setVisibility(visible)
    {
        this.visible = visible;
    }
    
    /**
     * @param type {string}
     * @param errorOut {boolean}
     * @private
     * @returns {SubSection|undefined}
     */
    _getSection(type, errorOut = false)
    {
        const t = type.toLowerCase();
        const result = this.subData.find(s => s.type.toLowerCase() === t);
        if (!result && errorOut)
        {
            throw new Error(`Section ${type} not found!`);
        }
        return result;
    }
    
    /**
     * Loads Advanced SubStation (.ass) subtitles
     * @param assString {string}
     */
    loadASSSubtitles(assString)
    {
        // reset all data
        this.init();
        // time to parse!!
        const lines = assString.replaceAll("\r\n", "\n").split("\n");
        let isSection = false;
        let sectionName = "";
        /**
         * @type {SubContent[]}
         */
        let sectionContents = [];
        for (const line of lines)
        {
            if (line.startsWith("["))
            {
                sectionName = line;
                isSection = true;
            }
            else if (line.length === 0 && isSection)
            {
                isSection = false;
                this.subData.push(new SubSection(sectionName, sectionContents));
                sectionContents = [];
            }
            else if (!line.startsWith("!") && !line.startsWith(";"))
            {
                // split only the first colon
                const data = line.split(/: (.*)/s);
                const content = new SubContent();
                content.type = data[0];
                content.data = data[1];
                sectionContents.push(content);
            }
        }
        
        // find the resolution
        const scriptInfo = this._getSection("[Script Info]", true);
        
        this.resolutionX = parseInt(scriptInfo.getContent("PlayResX", DEFAULT_RES_X.toString()));
        this.resolutionY = parseInt(scriptInfo.getContent("PlayResY", DEFAULT_RES_Y.toString()));
        this.kerning = scriptInfo.getContent("Kerning", "yes") === "yes";
        this.timer = parseFloat(scriptInfo.getContent("Timer", "100")) / 100;
        
        // load styles
        const styles = this._getSection("[V4+ Styles]", true);
        const styleFormats = styles.getContent("Format", "").split(", ");
        for (const style of styles.contents)
        {
            if (style.type !== "Style")
            {
                continue;
            }
            const data = style.data.split(",");
            if (data.length !== styleFormats.length)
            {
                throw new Error(`Format and style data counts do not match. Expected ${styleFormats.length} got ${data.length}`);
            }
            const newStyle = {};
            for (let i = 0; i < data.length; i++)
            {
                newStyle[styleFormats[i]] = data[i];
            }
            this.styles.push(newStyle);
        }
        
        // load events
        const events = this._getSection("[Events]", true);
        const eventFormats = events.getContent("Format", "").split(", ");
        for (const event of events.contents)
        {
            if (event.type !== "Dialogue")
            {
                continue;
            }
            const data = event.data.split(",", eventFormats.length);
            if (data.length !== eventFormats.length)
            {
                throw new Error(`Format and dialogue data counts do not match. Expected ${eventFormats.length} got ${data.length}`);
            }
            const eventData = {};
            for (let i = 0; i < data.length; i++)
            {
                eventData[eventFormats[i]] = data[i];
            }
            const newEvent = new DialogueEvent();
            newEvent.text = eventData["Text"] || "";
            newEvent.startSeconds = eventData["Start"] ? ASStimeToFloat(eventData["Start"]) : 0;
            newEvent.endSeconds = eventData["End"] ? ASStimeToFloat(eventData["End"]) : 0;
            newEvent.styleName = eventData["Style"] || "";
            newEvent.layer = parseInt(eventData["Layer"]) || 0;
            newEvent.marginLeft = parseInt(eventData["MarginL"]) || 0;
            newEvent.marginRight = parseInt(eventData["MarginR"]) || 0;
            newEvent.marginVertical = parseInt(eventData["MarginV"]) || 0;
            
            this.events.push(newEvent);
        }
        console.log(this.styles, this.events);
    }
    
}