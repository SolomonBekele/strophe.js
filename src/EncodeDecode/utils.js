/* eslint-disable linebreak-style */

// Function to convert a DOM element to a JavaScript object
export function domToJSObject(domElement) {
    if (!domElement) return null;
    const name = domElement.nodeName;
    const attrs = Array.from(domElement.attributes, (attr) => [attr.name, attr.value]);
    const children = [];
    Array.from(domElement.childNodes).forEach((child) => {
        if (child.nodeType === 1) {
            // Element node
            children.push(domToJSObject(child));
        } else if (child.nodeType === 3 && child.nodeValue.trim()) {
            // Text node with non-whitespace content
            children.push({ content: child.nodeValue });
        }
    });
    return { name, attrs, children };
}
