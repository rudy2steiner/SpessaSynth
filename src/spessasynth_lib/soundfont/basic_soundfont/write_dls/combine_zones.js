import { Modulator } from "../modulator.js";
import { BasicInstrumentZone } from "../basic_zones.js";
import { Generator, generatorLimits, generatorTypes } from "../generator.js";

/**
 * Combines preset zones
 * @param preset {BasicPreset}
 * @returns {BasicInstrumentZone[]}
 */
export function combineZones(preset)
{
    /**
     * @param main {Generator[]}
     * @param adder {Generator[]}
     */
    function addUnique(main, adder)
    {
        main.push(...adder.filter(g => !main.find(mg => mg.generatorType === g.generatorType)));
    }
    
    /**
     * @param r1 {SoundFontRange}
     * @param r2 {SoundFontRange}
     * @returns {SoundFontRange}
     */
    function subtractRanges(r1, r2)
    {
        return { min: Math.max(r1.min, r2.min), max: Math.min(r1.max, r2.max) };
    }
    
    /**
     * @param main {Modulator[]}
     * @param adder {Modulator[]}
     */
    function addUniqueMods(main, adder)
    {
        main.push(...adder.filter(m => !main.find(mm => Modulator.isIdentical(m, mm))));
    }
    
    /**
     * @type {BasicInstrumentZone[]}
     */
    const finalZones = [];
    
    /**
     * @type {Generator[]}
     */
    const globalPresetGenerators = [];
    /**
     * @type {Modulator[]}
     */
    const globalPresetModulators = [];
    let globalPresetKeyRange = { min: 0, max: 127 };
    let globalPresetVelRange = { min: 0, max: 127 };
    
    // find the global zone and apply ranges, generators and modulators
    const globalPresetZone = preset.presetZones.find(z => z.isGlobal);
    if (globalPresetZone)
    {
        globalPresetGenerators.push(...globalPresetZone.generators);
        globalPresetModulators.push(...globalPresetZone.modulators);
        globalPresetKeyRange = globalPresetZone.keyRange;
        globalPresetVelRange = globalPresetZone.velRange;
    }
    // for each non-global preset zone
    for (const presetZone of preset.presetZones)
    {
        if (presetZone.isGlobal)
        {
            continue;
        }
        // use global ranges if not provided
        let presetZoneKeyRange = presetZone.keyRange;
        if (!presetZone.hasKeyRange)
        {
            presetZoneKeyRange = globalPresetKeyRange;
        }
        let presetZoneVelRange = presetZone.velRange;
        if (!presetZone.hasKeyRange)
        {
            presetZoneVelRange = globalPresetVelRange;
        }
        // add unique generators and modulators from the global zone
        const presetGenerators = [...presetZone.generators];
        addUnique(presetGenerators, globalPresetGenerators);
        const presetModulators = [...presetZone.modulators];
        addUniqueMods(presetModulators, globalPresetModulators);
        
        const iZones = presetZone.instrument.instrumentZones;
        /**
         * @type {Generator[]}
         */
        const globalInstGenerators = [];
        /**
         * @type {Modulator[]}
         */
        const globalInstModulators = [];
        let globalInstKeyRange = { min: 0, max: 127 };
        let globalInstVelRange = { min: 0, max: 127 };
        const globalInstZone = iZones.find(z => z.isGlobal);
        if (globalInstZone)
        {
            globalInstGenerators.push(...globalInstZone.generators);
            globalInstModulators.push(...globalInstZone.modulators);
            globalInstKeyRange = globalInstZone.keyRange;
            globalInstVelRange = globalInstZone.velRange;
        }
        // for each non-global instrument zone
        for (const instZone of iZones)
        {
            if (instZone.isGlobal)
            {
                continue;
            }
            // use global ranges if not provided
            let instZoneKeyRange = instZone.keyRange;
            if (!instZone.hasKeyRange)
            {
                instZoneKeyRange = globalInstKeyRange;
            }
            let instZoneVelRange = instZone.velRange;
            if (!instZone.hasKeyRange)
            {
                instZoneVelRange = globalInstVelRange;
            }
            instZoneKeyRange = subtractRanges(instZoneKeyRange, presetZoneKeyRange);
            instZoneVelRange = subtractRanges(instZoneVelRange, presetZoneVelRange);
            
            // if either of the zones is out of range (i.e. min larger than max)
            // then we discard that zone
            if (instZoneKeyRange.max < instZoneKeyRange.min || instZoneVelRange.max < instZoneVelRange.min)
            {
                continue;
            }
            
            // add unique generators and modulators from the global zone
            const instGenerators = [...instZone.generators];
            addUnique(instGenerators, globalInstGenerators);
            const instModulators = [...instZone.modulators];
            addUniqueMods(instModulators, globalInstModulators);
            
            /**
             * sum preset modulators to instruments (amount) sf spec page 54
             * @type {Modulator[]}
             */
            const finalModList = [...instModulators];
            for (const mod of presetModulators)
            {
                const identicalInstMod = finalModList.findIndex(
                    m => Modulator.isIdentical(mod, m));
                if (identicalInstMod !== -1)
                {
                    // sum the amounts (this makes a new modulator because otherwise it would overwrite the one in the soundfont!!!
                    finalModList[identicalInstMod] = finalModList[identicalInstMod].sumTransform(
                        mod);
                }
                else
                {
                    finalModList.push(mod);
                }
            }
            
            const finalGenList = [...instGenerators];
            for (const gen of presetGenerators)
            {
                if (gen.generatorType === generatorTypes.velRange ||
                    gen.generatorType === generatorTypes.keyRange ||
                    gen.generatorType === generatorTypes.instrument ||
                    gen.generatorType === generatorTypes.endOper ||
                    gen.generatorType === generatorTypes.sampleModes)
                {
                    continue;
                }
                const identicalInstGen = instGenerators.findIndex(g => g.generatorType === gen.generatorType);
                if (identicalInstGen !== -1)
                {
                    // if exists, sum to that generator
                    const newAmount = finalGenList[identicalInstGen].generatorValue + gen.generatorValue;
                    finalGenList[identicalInstGen] = new Generator(gen.generatorType, newAmount);
                }
                else
                {
                    // if not, sum to the default generator
                    const newAmount = generatorLimits[gen.generatorType].def + gen.generatorValue;
                    finalGenList.push(new Generator(gen.generatorType, newAmount));
                }
            }
            
            // create the zone and copy over values
            const zone = new BasicInstrumentZone();
            zone.keyRange = instZoneKeyRange;
            zone.velRange = instZoneVelRange;
            zone.isGlobal = false;
            zone.sample = instZone.sample;
            zone.generators = finalGenList;
            zone.modulators = finalModList;
            finalZones.push(zone);
        }
    }
    return finalZones;
}