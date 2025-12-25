import { adjacentBitSwapTable, nibbleSwapTable } from './lookupTables';

/* eslint-disable linebreak-style */
const IS_ELEMENT = 20;
const IS_CONTENT = 10;

class XMLConverter {
    /**
     * Creates an instance of XMLConverter.
     *
     * @param {Object} [options={}] - Configuration options for the XMLConverter.
     * @param {Object} [options.mapperModule] - Optional module for mapping.
     * @param {boolean} [options.swapEnabled=false] - Flag to enable or disable tag swapping.
     * @param {Array} [options.swapTags=[]] - List of tags to be swapped if swapEnabled is true.
     * @param {string|ArrayBuffer} [binaryData=''] - Binary data to be processed, either as a string or an ArrayBuffer.
     */
    constructor(options = {}, binaryData = '') {
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder('utf-8');
        this.accumulator = new Uint8Array(0); // Initialize accumulator as a class variable
        this.mapperModule = options.mapperModule || undefined;
        this.swapEnabled = options.swapEnabled || false;
        this.swapTags = options.swapTags || [];
        this.binaryData =
            binaryData instanceof ArrayBuffer ? new Uint8Array(binaryData) : this.encoder.encode(binaryData); // Class variable to store binary data
    }

    /**
     * Sets the binary data for the instance.
     *
     * @param {ArrayBuffer|string} binaryData - The binary data to set. If an ArrayBuffer is provided,
     * it will be converted to a Uint8Array. If a string is provided, it will be encoded to a Uint8Array
     * using the TextEncoder.
     */
    setBin(binaryData) {
        this.binaryData =
            binaryData instanceof ArrayBuffer ? new Uint8Array(binaryData) : this.encoder.encode(binaryData);
    }

    /**
     * Encodes a string into binary format and adds it to the accumulator.
     *
     * This method performs the following steps:
     * 1. Converts the input string to a binary format using UTF-8 encoding
     * 2. Gets the length of the binary data
     * 3. Optionally swaps adjacent bits if swapping is enabled
     * 4. Encodes the length as a variable-length number
     * 5. Adds both the encoded length and binary data to the accumulator
     *
     * @param {string} str - The string to encode
     */
    encodeString(str) {
        const binaryData = this.encoder.encode(str);
        const length = binaryData.length;
        const swappedBin = this.swapEnabled ? XMLConverter.nibbleSwap(binaryData) : binaryData;
        const encodedLength = XMLConverter.encodeNumber(length);
        this.addToAcc(encodedLength);
        this.addToAcc(swappedBin);
    }

    /**
     * Encodes a given string and adds the encoded result to the accumulator.
     *
     * @param {string} str - The string to be encoded.
     * @param {boolean} isFixed - Indicates if the string is a fixed value (e.g., attribute key, element tag name).
     */
    encodeStringAddToAcc(str, isFixed = false) {
        let binaryData;
        if (this.swapEnabled) {
            if (false) {
                // keeping it false for now
                binaryData = this.encodeStaticString(str);
            } else {
                binaryData = XMLConverter.nibbleSwap(this.encoder.encode(str));
            }
        } else {
            binaryData = this.encoder.encode(str);
        }
        const length = binaryData.length;
        this.encodeNumberAddtoAcc(length);
        this.addToAcc(binaryData);
    }

    /**
     * Decodes a string from the binary data.
     *
     * This method first decodes a number which represents the length of the string.
     * It then slices the binary data to get the relevant portion for the string.
     * If swapping is enabled, it swaps adjacent bits in the binary data.
     * Finally, it decodes the binary data into a string using the decoder.
     *
     * @returns {string} The decoded string.
     */
    decodeString(isFixed = false) {
        const length = this.decodeNumber();
        const binaryStr = this.binaryData.slice(0, length);
        this.binaryData = this.binaryData.slice(length);

        let decodedStr;
        if (this.swapEnabled) {
            if (false) {
                // keeping it false for now
                decodedStr = XMLConverter.decodeStaticString(binaryStr);
            } else {
                decodedStr = this.swapEnabled ? XMLConverter.nibbleSwap(binaryStr) : binaryStr;
            }
        } else {
            decodedStr = binaryStr;
        }

        return this.decoder.decode(decodedStr);
    }

    /**
     * Swaps the nibbles (4-bit halves) of each byte in the given Uint8Array.
     *
     * @param {Uint8Array} binaryData - The input array of bytes to be nibble-swapped.
     * @returns {Uint8Array} A new Uint8Array with the nibbles of each byte swapped.
     */
    static nibbleSwap(binaryData) {
        const swapped = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
            swapped[i] = nibbleSwapTable[binaryData[i]];
        }
        return swapped;
    }

    /**
     * Swaps adjacent bits in each byte of the given Uint8Array using a lookup table.
     *
     * @param {Uint8Array} binaryData - The input array of bytes.
     * @returns {Uint8Array} A new Uint8Array with adjacent bits swapped in each byte.
     */
    static swapAdjacentBits(binaryData) {
        const swapped = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
            swapped[i] = adjacentBitSwapTable[binaryData[i]];
        }
        return swapped;
    }

    /**
     * Encodes a given number into a Uint8Array using a variable-length encoding scheme.
     *
     * This method is particularly useful for encoding integers in a compact form.
     * It uses a continuation bit to indicate whether more bytes are part of the number.
     *
     * @param {number} number - The number to encode. Must be a non-negative integer.
     * @returns {Uint8Array} A Uint8Array containing the encoded number.
     */
    static encodeNumber(number) {
        // Early return for zero case
        if (number === 0) return new Uint8Array([0]);

        // Pre-allocate buffer for maximum possible size (5 bytes for 32-bit number)
        const result = new Uint8Array(5);
        let index = 0;

        // Process number using unsigned operations
        do {
            let byte = number & 0x7f; // Get last 7 bits
            number >>>= 7; // Unsigned right shift
            if (number > 0) byte |= 0x80; // Set continuation bit if more data
            result[index++] = byte;
        } while (number > 0 && index < 5); // Protect against overflow

        // Return view of only the used portion
        return new Uint8Array(result.buffer, 0, index);
    }

    /**
     * Encodes a given number into a variable-length format and adds it to the accumulator.
     * The encoding uses a continuation bit to handle numbers larger than 7 bits.
     *
     * @param {number} number - The number to encode and add to the accumulator.
     */
    encodeNumberAddtoAcc(number) {
        // Early return for zero
        if (number === 0) {
            this.addToAcc(new Uint8Array([0]));
            return;
        }

        // Pre-allocate maximum possible size (5 bytes for 32-bit number)
        const result = new Uint8Array(5);
        let index = 0;

        // Process number
        do {
            let byte = number & 0x7f; // Get last 7 bits
            number >>>= 7; // Unsigned right shift
            if (number > 0) byte |= 0x80; // Set continuation bit if more data
            result[index++] = byte;
        } while (number > 0 && index < 5);

        // Add only the used portion of the array
        this.addToAcc(new Uint8Array(result.buffer, 0, index));
    }

    /**
     * Decodes a number from the binary data stored in `this.binaryData`.
     * The number is encoded using a variable-length encoding scheme where each byte
     * contains 7 bits of the number, and the highest bit indicates if there are more bytes.
     *
     * @returns {number} The decoded number.
     * @throws {Error} If the binary format is invalid or incomplete.
     */
    decodeNumber() {
        // Early return for zero value
        if (this.binaryData[0] === 0) {
            this.binaryData = this.binaryData.slice(1);
            return 0;
        }

        // Pre-calculate length for bounds checking
        const binLength = this.binaryData.length;
        let number = 0;
        let shift = 0;
        let currentIndex = 0;

        // Use do-while loop to ensure at least one iteration
        do {
            // Bounds check
            if (currentIndex >= binLength) {
                throw new Error('Invalid binary format: incomplete number');
            }

            const byte = this.binaryData[currentIndex];
            number |= (byte & 0x7f) << shift;

            // Exit if highest bit is not set
            if ((byte & 0x80) === 0) {
                currentIndex++;
                break;
            }

            shift += 7;
            currentIndex++;
        } while (shift < 32); // Prevent infinite loops and overflow

        // Update binaryData array once at the end
        this.binaryData = this.binaryData.slice(currentIndex);
        return number;
    }

    /**
     * Adds binary data to the accumulator efficiently
     * @param {Uint8Array} array - Binary data to add
     * @private
     */
    addToAcc(array) {
        // Early return for empty array
        if (!array.length) return;

        // If accumulator is empty, just set it to the input array
        if (!this.accumulator.length) {
            this.accumulator = array;
            return;
        }

        // Pre-allocate new buffer with exact size needed
        const newAcc = new Uint8Array(this.accumulator.length + array.length);

        // Use set() for bulk copying - more efficient than loop
        newAcc.set(this.accumulator);
        newAcc.set(array, this.accumulator.length);

        // Update reference
        this.accumulator = newAcc;
    }

    encodeElement(element, converterOptions = {}) {
        const { name, attrs, children } = element;
        this.encodeStringAddToAcc(name, true); // Fixed value
        // Handle attributes
        const attrsLength = attrs.length;
        this.encodeNumberAddtoAcc(attrsLength);
        if (attrsLength > 0) {
            for (const [key, value] of attrs) {
                this.encodeStringAddToAcc(key, true); // Fixed value
                this.encodeStringAddToAcc(value); // Dynamic value
            }
        }
        // Handle children
        const childrenLength = children.length;
        if (childrenLength === 0) {
            this.encodeNumberAddtoAcc(IS_ELEMENT);
            this.encodeNumberAddtoAcc(0);
            return this.accumulator;
        }
        const childrenType = children[0].name ? IS_ELEMENT : IS_CONTENT;
        this.encodeNumberAddtoAcc(childrenType);

        if (childrenType === IS_ELEMENT) {
            this.encodeNumberAddtoAcc(childrenLength);
        }
        for (const child of children) {
            if (child.name) {
                this.encodeElement(child, converterOptions);
            } else if (child.content) {
                this.encodeStringAddToAcc(child.content); // Dynamic value
            }
        }
        return this.accumulator;
    }

    decodeElement(converterOptions = {}) {
        // Decode core element properties
        const name = this.decodeString(true); // Fixed value
        // Handle attributes
        const attrCount = this.decodeNumber();
        const attrs = attrCount > 0 ? new Array(attrCount) : [];
        for (let i = 0; i < attrCount; i++) {
            attrs[i] = [this.decodeString(true), this.decodeString()];
        }
        // Handle children
        const childrenType = this.decodeNumber();
        const children = [];
        if (childrenType === IS_ELEMENT) {
            const childCount = this.decodeNumber();
            if (childCount > 0) {
                children.length = childCount;
                for (let i = 0; i < childCount; i++) {
                    children[i] = this.decodeElement(converterOptions);
                }
            }
        } else if (childrenType === IS_CONTENT) {
            children.push({ content: this.decodeString() }); // Dynamic value
        }
        return { name, attrs, children };
    }

    elementToString(element) {
        const { name, attrs, children } = element;
        const parts = [];
        parts.push('<', name);
        if (attrs.length) {
            parts.push(' ', attrs.map(([key, value]) => `${key}="${value}"`).join(' '));
        }
        parts.push('>');
        if (children.length) {
            for (const child of children) {
                if (child) {
                    if (child.name) {
                        parts.push(this.elementToString(child));
                    } else if (child.content) {
                        parts.push(child.content);
                    }
                }
            }
        }
        parts.push('</', name, '>');
        return parts.join('');
    }

    encodeStaticString(s) {
        // Convert the string to a Uint8Array
        const uint8Array = this.encoder.encode(s);

        // Find the smallest ASCII value in the Uint8Array
        const smallestAscii = Math.min(...uint8Array);

        // Replace each character with character - smallest
        const encodedArray = uint8Array.map((value) => value - smallestAscii);

        // Create a new Uint8Array with the smallest ASCII value at the beginning
        const resultArray = new Uint8Array(encodedArray.length + 1);
        resultArray[0] = smallestAscii;
        resultArray.set(encodedArray, 1);

        // Return the resulting Uint8Array
        return resultArray;
    }

    static decodeStaticString(uint8Array) {
        // Extract the smallest ASCII value from the first byte
        const smallestAscii = uint8Array[0];

        // Decode the rest of the array by adding the smallest ASCII value back
        const decodedArray = uint8Array.slice(1).map((value) => value + smallestAscii);
        return decodedArray;
    }
}

export default XMLConverter;
