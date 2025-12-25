// Precompute the nibble swap lookup table
const nibbleSwapTable = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
    nibbleSwapTable[i] = ((i & 0x0f) << 4) | ((i & 0xf0) >> 4);
}

// Precompute the adjacent bit swap lookup table
const adjacentBitSwapTable = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
    let swapped = 0;
    for (let bit = 0; bit < 8; bit += 2) {
        const bit1 = (i >> bit) & 1;
        const bit2 = (i >> (bit + 1)) & 1;
        swapped |= (bit1 << (bit + 1)) | (bit2 << bit);
    }
    adjacentBitSwapTable[i] = swapped;
}

export { nibbleSwapTable, adjacentBitSwapTable };
