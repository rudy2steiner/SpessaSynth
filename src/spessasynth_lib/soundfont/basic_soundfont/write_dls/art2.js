import { getDLSArticulatorFromSf2Generator, getDLSArticulatorFromSf2Modulator } from "./modulator_converter.js";
import { writeRIFFOddSize } from "../riff_chunk.js";
import { combineArrays, IndexedByteArray } from "../../../utils/indexed_array.js";
import { Generator, generatorTypes } from "../generator.js";
import { writeDword } from "../../../utils/byte_functions/little_endian.js";
import { consoleColors } from "../../../utils/other.js";
import { SpessaSynthInfo, SpessaSynthWarn } from "../../../utils/loggin.js";

const invalidGeneratorTypes = new Set([
    generatorTypes.sampleModes,
    generatorTypes.initialAttenuation,
    generatorTypes.keyRange,
    generatorTypes.velRange,
    generatorTypes.sampleID,
    generatorTypes.fineTune,
    generatorTypes.coarseTune,
    generatorTypes.startAddrsOffset,
    generatorTypes.startAddrsCoarseOffset,
    generatorTypes.endAddrOffset,
    generatorTypes.endAddrsCoarseOffset,
    generatorTypes.startloopAddrsOffset,
    generatorTypes.startloopAddrsCoarseOffset,
    generatorTypes.endloopAddrsOffset,
    generatorTypes.endloopAddrsCoarseOffset,
    generatorTypes.overridingRootKey,
    generatorTypes.exclusiveClass
]);

/**
 * @param zone {BasicInstrumentZone}
 * @returns {IndexedByteArray}
 */
export function writeArticulator(zone)
{
    /**
     * @returns {number}
     */
    
    // read_articulation.js:
    // according to viena and another strange (with modulators) rendition of gm.dls in sf2,
    // it shall be divided by -128
    // and a strange correction needs to be applied to the real value:
    // real + (60 / 128) * scale
    
    // we invert this here
    for (let i = 0; i < zone.generators.length; i++)
    {
        const relativeGenerator = zone.generators[i];
        let absoluteCounterpart = undefined;
        switch (relativeGenerator.generatorType)
        {
            default:
                continue;
            
            case generatorTypes.keyNumToVolEnvDecay:
                absoluteCounterpart = generatorTypes.decayVolEnv;
                break;
            case generatorTypes.keyNumToVolEnvHold:
                absoluteCounterpart = generatorTypes.holdVolEnv;
                break;
            case generatorTypes.keyNumToModEnvDecay:
                absoluteCounterpart = generatorTypes.decayModEnv;
                break;
            case generatorTypes.keyNumToModEnvHold:
                absoluteCounterpart = generatorTypes.holdModEnv;
        }
        let absoluteGenerator = zone.generators.find(g => g.generatorType === absoluteCounterpart);
        if (absoluteGenerator === undefined)
        {
            // there's no absolute generator here.
            continue;
        }
        const dlsRelative = relativeGenerator.generatorValue * -128;
        const subtraction = (60 / 128) * dlsRelative;
        const newAbsolute = absoluteGenerator.generatorValue - subtraction;
        
        const iR = zone.generators.indexOf(relativeGenerator);
        const iA = zone.generators.indexOf(absoluteGenerator);
        zone.generators[iA] =
            new Generator(absoluteCounterpart, newAbsolute, false);
        zone.generators[iR] =
            new Generator(relativeGenerator.generatorType, dlsRelative, false);
    }
    /**
     * @type {Articulator[]}
     */
    const generators = zone.generators.reduce((arrs, g) =>
    {
        if (invalidGeneratorTypes.has(g.generatorType))
        {
            return arrs;
        }
        const art = getDLSArticulatorFromSf2Generator(g);
        if (art !== undefined)
        {
            arrs.push(art);
            SpessaSynthInfo("%cSucceeded converting to DLS Articulator!", consoleColors.recognized);
            
        }
        else
        {
            SpessaSynthWarn("Failed converting to DLS Articulator!");
        }
        return arrs;
    }, []);
    /**
     * @type {Articulator[]}
     */
    const modulators = zone.modulators.reduce((arrs, m) =>
    {
        const art = getDLSArticulatorFromSf2Modulator(m);
        if (art !== undefined)
        {
            arrs.push(art);
            SpessaSynthInfo("%cSucceeded converting to DLS Articulator!", consoleColors.recognized);
            
        }
        else
        {
            SpessaSynthWarn("Failed converting to DLS Articulator!");
        }
        return arrs;
    }, []);
    generators.push(...modulators);
    
    const art2Data = new IndexedByteArray(8);
    writeDword(art2Data, 8); // cbSize
    writeDword(art2Data, generators.length); // cbConnectionBlocks
    
    
    const out = generators.map(a => a.writeArticulator());
    return writeRIFFOddSize(
        "art2",
        combineArrays([art2Data, ...out])
    );
}