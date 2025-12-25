/* eslint-disable linebreak-style */
import { domToJSObject } from './utils';
import XMLConverter from './XMLConverter';

const { DOMParser } = require('xmldom');

// Example usage
export const converterOptions = {
    mapperModule: undefined,
    swapEnabled: true, // Enable bit swapping
    swapTags: [],
};

// const xmlString = `<features xmlns="http://etherx.jabber.org/streams"><mechanisms xmlns="urn:ietf:params:xml:ns:xmpp-sasl"><mechanism>SCRAM-SHA-1</mechanism><mechanism>PLAIN</mechanism></mechanisms><c xmlns="http://jabber.org/protocol/caps" hash="sha-1" node="https://www.erlang-solutions.com/products/mongooseim.html" ver="0/40fWRni+9CnbDkieKpM6GLNI0="/><sm xmlns="urn:xmpp:sm:3"/></features>`;

const encodeXmlString = (xmlString) => {
    const converter = new XMLConverter(converterOptions);
    const domParser = new DOMParser();
    const parsedDom = domParser.parseFromString(xmlString, 'application/xml');
    const domObject = domToJSObject(parsedDom.documentElement);
    const encodedUint8Array = converter.encodeElement(domObject, converterOptions);
    // const decodedXmlString = decodeData(encodedUint8Array.buffer);
    return encodedUint8Array.buffer;
};

const decodeBinaryData = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const decodedXmlString = decodeData(arrayBuffer);
    return decodedXmlString;
};

const decodeData = (arrayBuffer) => {
    const converter = new XMLConverter(converterOptions, arrayBuffer);
    const decodedElement = converter.decodeElement(converterOptions);
    return converter.elementToString(decodedElement);
};

export default XMLConverter;
export { encodeXmlString, decodeBinaryData };
