// -----------------------------------------------------------
// MIT Licence (Expat License Wording)
// -----------------------------------------------------------
// Copyright © 2020, Damien Gouteux
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// For more information about my projects see:
// https://xitog.github.io/dgx (in French)

//-------------------------------------------------------------------------------
// Imports
//-------------------------------------------------------------------------------

import { LANGUAGES, LEXERS } from "./weyland.mjs";

const node =
    typeof process !== "undefined" &&
    process !== null &&
    typeof process?.version !== "undefined" &&
    typeof process?.version === "string";

const fs = node ? await import("fs") : null;
const path = node ? await import("path") : null;
const reader = node ? await import("readline-sync") : null;
const argv = process.argv;

//-----------------------------------------------------------------------------
// Constants
//-----------------------------------------------------------------------------

const VERSION = '2.0.6';

//-----------------------------------------------------------------------------
// Classes
//-----------------------------------------------------------------------------

// Tagged lines

class Line {
    constructor(value, type, param = null) {
        this.value = value;
        this.type = type;
        this.param = param;
    }

    toString() {
        if (this.param === null) {
            return `${this.type} |${this.value}|`;
        } else {
            return `${this.type} |${this.value}| (${this.param})`;
        }
    }
}

// Document nodes

class EmptyNode {
    constructor(document, ids = null, cls = null) {
        this.document = document;
        if (this.document === undefined || this.document === null) {
            throw new Error("Undefined or null document");
        }
        this.ids = ids;
        this.cls = cls;
        if (this.ids !== null) {
            this.document.register_id(this.ids);
        }
    }

    toString() {
        return this.constructor.name;
    }
}

class Node extends EmptyNode {
    constructor(document, content = null, ids = null, cls = null) {
        super(document, ids, cls);
        this.content = content;
    }

    toString() {
        if (this.content === null) {
            return this.constructor.name;
        } else {
            return this.constructor.name + " { content: " + this.content + " }";
        }
    }
}

class Text extends Node {
    to_html() {
        return this.document.safe(this.content);
    }
}

class Start extends Node {
    to_html() {
        let markups = {
            bold: "b",
            italic: "i",
            stroke: "s",
            underline: "u",
            sup: "sup",
            sub: "sub",
            strong: "strong",
            em: "em",
            // 'code': 'code'
        };
        if (!(this.content in markups)) {
            throw new Error(`Unknown text style:${this.content}`);
        }
        return `<${markups[this.content]}>`;
    }
}

class Stop extends Node {
    to_html() {
        let markups = {
            bold: "b",
            italic: "i",
            stroke: "s",
            underline: "u",
            sup: "sup",
            sub: "sub",
            strong: "strong",
            em: "em",
            // 'code': 'code'
        };
        if (!(this.content in markups)) {
            throw new Error(`Unknown text style:${this.content}`);
        }
        return `</${markups[this.content]}>`;
    }
}

class Picture extends Node {
    constructor(document, url, text = null, cls = null, ids = null) {
        super(document, url, ids, cls);
        this.text = text;
    }

    to_html() {
        let cls = (this.cls === null) ? '' : ` class="${this.cls}"`;
        let ids = (this.ids === null) ? '' : ` id="${this.ids}"`;
        let p = this.document.get_variable("DEFAULT_FIND_IMAGE", "");
        let target = p == null || p == "" ? this.content : [p, this.content].join("/");

        if (this.text !== null) {
            return `<figure><img${cls}${ids} src="${target}" alt="${this.text}"></img><figcaption>${this.text}</figcaption></figure>`;
        } else {
            return `<img${cls}${ids} src="${target}"/>`;
        }
    }
}

class HR extends EmptyNode {
    to_html() {
        return "<hr>\n";
    }
}

class BR extends EmptyNode {
    to_html() {
        return "<br>";
    }
}

class ParagraphIndicator extends EmptyNode {

    to_html() {
        let cls = (this.cls === null) ? '' : ` class="${this.cls}"`;
        let ids = (this.ids === null) ? '' : ` id="${this.ids}"`;
        return `<p${ids}${cls}>`;
    }
}

class Comment extends Node { }

class Row extends EmptyNode {
    constructor(document, node_list_list) {
        super(document);
        this.node_list_list = node_list_list;
        this.is_header = false;
    }
}

class RawHTML extends Node {
    to_html() {
        return this.content + "\n";
    }
}

class Include extends Node { }

class Title extends Node {
    constructor(document, content, level) {
        super(document, content);
        this.level = level;
    }
}

class StartDetail extends Node {

    to_html() {
        let cls = (this.cls === null) ? '' : ` class="${this.cls}"`;
        let ids = (this.ids === null) ? '' : ` id="${this.ids}"`;
        return `<details${ids}${cls}><summary>${this.content}</summary>\n`;
    }
}

class Detail extends Node {
    constructor(document, content, data, ids = null, cls = null) {
        super(document, content, ids, cls);
        this.data = data;
    }

    to_html() {
        let cls = (this.cls === null) ? '' : ` class="${this.cls}"`;
        let ids = (this.ids === null) ? '' : ` id="${this.ids}"`;
        return `<details${ids}${cls}><summary>${this.content}</summary>${this.data}</details>\n`;
    }
}

class EndDetail extends EmptyNode {
    to_html() {
        return "</details>\n";
    }
}

class StartDiv extends EmptyNode {
    constructor(document, ids = null, cls = null) {
        super(document, ids, cls);
    }

    to_html() {
        let cls = (this.cls === null) ? '' : ` class="${this.cls}"`;
        let ids = (this.ids === null) ? '' : ` id="${this.ids}"`;
        return `<div${ids}${cls}>\n`;
    }
}

class EndDiv extends EmptyNode {
    to_html() {
        return "</div>\n";
    }
}

class Composite extends EmptyNode {
    constructor(document, parent = null) {
        super(document);
        this.children = [];
        this.parent = parent;
    }
    add_child(o) {
        if (!(o instanceof EmptyNode)) {
            throw new Error(
                "A composite can only be made of EmptyNode and subclasses"
            );
        }
        this.children.push(o);
        if (o instanceof Composite) {
            o.parent = this;
        }
        return o;
    }
    add_children(ls) {
        for (let e of ls) {
            this.add_child(e);
        }
    }
    last() {
        return this.children[this.children.length - 1];
    }
    get_parent() {
        return this.parent;
    }
    root() {
        if (this.parent === null) {
            return this;
        } else {
            return this.parent.root();
        }
    }
    toString() {
        return this.constructor.name + ` (${this.children.length})`;
    }
    pop() {
        return this.children.pop();
    }
    to_html(level = 0) {
        let s = "";
        for (const child of this.children) {
            if (child instanceof ElementList) {
                s += "\n" + child.to_html(level);
            } else {
                s += child.to_html();
            }
        }
        return s;
    }
}

class TextLine extends Composite {
    constructor(document, children = []) {
        super(document);
        this.add_children(children);
    }
    to_html() {
        return this.document.string_to_html("", this.children);
    }
}

class Span extends TextLine {
    constructor(document, children = [], ids = null, cls = null) {
        super(document, children);
        this.ids = ids;
        this.cls = cls;
    }

    to_html() {
        let cls = (this.cls === null) ? '' : ` class="${this.cls}"`;
        let ids = (this.ids === null) ? '' : ` id="${this.ids}"`;
        let content = this.document.string_to_html("", this.children); // New
        return `<span${ids}${cls}>${content}</span>`;
    }
}

class ElementList extends Composite {
    constructor(
        document,
        parent,
        ordered = false,
        reverse = false,
        level = 0,
        children = []
    ) {
        super(document, parent);
        this.add_children(children);
        this.level = level;
        this.ordered = ordered;
        this.reverse = reverse;
    }

    to_html(level = 0) {
        let start = "    ".repeat(level);
        let end = "    ".repeat(level);
        if (this.ordered) {
            if (this.reverse) {
                start += "<ol reversed>";
            } else {
                start += "<ol>";
            }
            end += "</ol>";
        } else {
            start += "<ul>";
            end += "</ul>";
        }
        let s = start + "\n";
        for (const child of this.children) {
            s += "    ".repeat(level) + "  <li>";
            if (child instanceof ElementList) {
                s += "\n" + child.to_html(level + 1) + "  </li>\n";
            } else if (
                child instanceof Composite &&
                !(child instanceof TextLine)
            ) {
                s += child.to_html(level + 1) + "  </li>\n";
            } else {
                s += child.to_html() + "</li>\n";
            }
        }
        s += end + "\n";
        return s;
    }
}

// [[label]] (you must define somewhere ::label:: https://) display = url
// [[https://...]] display = url
// [[display->label]] (you must define somewhere ::label:: https://)
// [[display->https://...]]
// [[display->#id]]
// [[display->#]] forge un id à partir du display
// http[s] can be omitted, but in this case the url should start by www.
class Link extends EmptyNode {
    constructor(document, url, display = null) {
        super(document);
        this.url = url;
        this.display = display; // list of nodes
    }
    toString() {
        return this.constructor.name + ` ${this.display} -> ${this.url}`;
    }
    to_html() {
        let url = this.url;
        let display = null;
        if (this.display !== null) {
            display = this.document.string_to_html("", this.display);
        }
        if (
            !url.startsWith("https://") &&
            !url.startsWith("http://") &&
            !url.startsWith("www.")
        ) {
            if (url === "#") {
                url = this.document.get_label_value(
                    this.document.make_anchor(display)
                );
            } else if (url.startsWith("#")) {
                // it is an ID, check if it exists
                if (!this.document.has_id(url.substring(1))) {
                    throw new Error(`Refering to an unknown id ${url.substring(1)}`);
                }
            } else {
                url = this.document.get_label_value(url);
            }
        }
        if (display === undefined || display === null) {
            display = url;
        }
        return `<a href="${url}">${display}</a>`;
    }
}

class Definition extends Node {
    constructor(document, header, content) {
        super(document, content);
        this.header = header;
    }
}

class Quote extends Node {
    constructor(document, content, cls = null, ids = null) {
        super(document, content);
        this.cls = cls;
        this.ids = ids;
    }
    toString() {
        return `Quote { content: ${this.content.replace(/\n/g, "\\n")}}`;
    }
    to_html() {
        let cls = (this.cls === null) ? '' : ` class="${this.cls}"`;
        let ids = (this.ids === null) ? '' : ` id="${this.ids}"`;
        return `<blockquote${ids}${cls}>\n` + this.document.safe(this.content).replace(/\n/g, "<br>\n") + "</blockquote>\n";
    }
}

class Code extends Node {
    constructor(document, content, ids = null, cls = null, lang = null, inline = false) {
        super(document, content, ids, cls);
        this.inline = inline;
        this.lang = lang;
    }

    toString() {
        let lang = this.lang == null ? this.document.get_variable("DEFAULT_CODE", "") : this.lang;
        lang = lang === null || lang === "" ? "" : `:${lang}`;
        let inline = (this.inline) ? " inline" : "";
        return `Code${lang} { content: ${this.content}}${inline}`;
    }

    to_html() {
        let output = this.content;
        let lang = this.lang == null ? this.document.get_variable("DEFAULT_CODE", "") : this.lang;
        if (lang !== null && lang !== "" && lang in LANGUAGES) {
            output = LEXERS[lang].to_html(this.content, null, [
                "blank",
            ]);
        }
        if (this.inline) {
            return "<code>" + output + "</code>";
        } else {
            let i = this.document.get_variable("NEXT_CODE_ID", "");
            let is = i != null && i != "" ? ` id="${i}"` : "";
            if (i !== null) {
                this.document.set_variable("NEXT_CODE_ID", null);
            }
            let c = this.document.get_variable("NEXT_CODE_CLASS", "");
            let cs = c != null && c != "" ? ` class="${c}"` : "";
            if (c !== null) {
                this.document.set_variable("NEXT_CODE_CLASS", null);
            }
            return `<pre${is}${cs}>\n` + output + "</pre>\n";
        }
    }
}

class GetVar extends Node {
    constructor(document, content) {
        super(document, content);
        if (content === null || content === undefined) {
            throw new Error("A GetVar node must have a content");
        }
    }
}

class SetVar extends EmptyNode {
    constructor(document, id, value, type, constant) {
        super(document);
        this.id = id;
        this.value = value;
        this.type = type;
        this.constant = constant;
    }

    toString() {
        return `${this.id} = ${this.value} (${this.type})`;
    }
}

// Variable & document

class Variable {
    constructor(document, name, type, value = null) {
        this.document = document;
        this.name = name;
        if (type !== "number" && type !== "string" && type !== "boolean") {
            throw new Error(`Unknown type ${type} for variable ${name}`);
        }
        this.type = type;
        this.value = value;
    }

    set_value(value) {
        if (
            (isNaN(value) && this.type === "number") ||
            (typeof value === "string" && this.type !== "string") ||
            (typeof value === "boolean" && this.type !== "boolean")
        ) {
            throw new Error(
                `Cant't set the value to ${value} for variable ${this.name} of type ${this.type}`
            );
        }
        this.value = value;
    }

    get_value() {
        if (this.name === "NOW") {
            return new Date().toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        } else return this.value;
    }
}

class Constant extends Variable {
    constructor(document, name, type, value = null) {
        super(document, name, type, value);
    }

    set_value(value) {
        if (this.value === null) {
            super.set_value(value);
        } else {
            throw new Error(
                `Can't set the value of the already set constant : ${this.name} of type ${this.type}`
            );
        }
    }
}

class Document {
    constructor(name = null) {
        this.name = name;
        let variables = [
            new Constant(this, "TITLE", "string"),
            new Constant(this, "ICON", "string"),
            new Constant(this, "LANG", "string"),
            new Constant(this, "ENCODING", "string"),
            new Constant(this, "VERSION", "string", `Hamill ${VERSION}`),
            new Constant(this, "NOW", "string", ""),
            new Variable(this, "PARAGRAPH_DEFINITION", "boolean", false),
            new Variable(this, "EXPORT_COMMENT", "boolean", false),
            new Variable(this, "DEFAULT_CODE", "string"),
            new Constant(this, "BODY_CLASS", "string"),
            new Constant(this, "BODY_ID", "string"),
            new Variable(this, "NEXT_TABLE_CLASS", "string"),
            new Variable(this, "NEXT_TABLE_ID", "string"),
            new Variable(this, "DEFAULT_TABLE_CLASS", "string"),
            new Variable(this, "DEFAULT_PARAGRAPH_CLASS", "string"),
            new Variable(this, "DEFAULT_FIND_IMAGE", "string"),
            new Variable(this, "NEXT_CODE_CLASS", "string"),
            new Variable(this, "NEXT_CODE_ID", "string")
        ];
        this.variables = {};
        for (const element of variables) {
            this.variables[element.name] = element;
        }
        this.required = [];
        this.css = [];
        this.labels = {};
        this.nodes = [];
        this.ids = [];
    }

    register_id(id) {
        if (this.ids.includes(id)) {
            for (const i of this.ids) {
                console.log(i);
            }
            throw new Error(`You are trying to define two elements with same id: ${id}`);
        }
        this.ids.push(id);
    }

    has_id(id) {
        return this.ids.includes(id);
    }

    set_name(name) {
        this.name = name;
    }

    to_html_file(output_directory = "") {
        let parts = this.name.split("/");
        let outfilename = parts[parts.length - 1];
        outfilename =
            outfilename.substring(0, outfilename.lastIndexOf(".hml")) + ".html";
        let target = "";
        if (fs.existsSync(output_directory) && fs.lstatSync(output_directory)?.isDirectory()) {
            target = output_directory + path.sep + outfilename;
        } else {
            target = outfilename;
        }
        fs.writeFileSync(target, this.to_html(true)); // with header
        console.log("Outputting in:", target);
    }

    has_variable(k) {
        return k in this.variables && this.variables[k] !== null;
    }

    set_variable(k, v, t = "string", c = false) {
        if (k in this.variables) {
            if (this.variables[k] instanceof Constant && !c) {
                throw new Error(`You are trying to declare a variable which use the name of the constant ${k}`)
            }
            this.variables[k].set_value(v);
        } else if (c) {
            this.variables[k] = new Constant(this, k, t, v);
        } else {
            this.variables[k] = new Variable(this, k, t, v);
        }
    }

    get_variable(k, default_value = null) {
        if (k in this.variables && this.variables[k].get_value() !== null) {
            return this.variables[k].get_value();
        } else if (default_value !== null) {
            return default_value;
        } else {
            console.log("Dumping variables:");
            for (const v of Object.values(this.variables)) {
                console.log("   ", v.name, "=", v.value);
            }
            throw new Error(`Unknown variable: ${k}`);
        }
    }

    add_required(r) {
        this.required.push(r);
    }

    add_css(c) {
        this.css.push(c);
    }

    add_label(l, v) {
        this.labels[l] = v;
    }

    add_node(n) {
        if (n === undefined || n === null) {
            throw new Error("Trying to add an undefined or null node");
        }
        this.nodes.push(n);
    }

    get_node(i) {
        return this.nodes[i];
    }

    get_label_value(target) {
        if (!(target in this.labels)) {
            for (const label in this.labels) {
                console.log(label);
            }
            throw new Error("Label not found : |" + target + "|");
        }
        return this.labels[target];
    }

    make_anchor(text) {
        let step1 = text.replace(/ /g, "-").toLocaleLowerCase();
        let result = "";
        let in_html = false;
        for (let c of step1) {
            if (c === "<") {
                in_html = true;
            } else if (c === ">") {
                in_html = false;
            } else if (!in_html) {
                result += c;
            }
        }
        return result;
    }

    string_to_html(content, nodes) {
        if (nodes === undefined || nodes === null) {
            throw new Error("No nodes to process");
        }
        if (typeof content !== "string")
            throw new Error("Parameter content should be of type string");
        if (
            !Array.isArray(nodes) ||
            (!(nodes[0] instanceof Start) &&
                !(nodes[0] instanceof Stop) &&
                !(nodes[0] instanceof Text) &&
                !(nodes[0] instanceof Link) &&
                !(nodes[0] instanceof GetVar) &&
                !(nodes[0] instanceof ParagraphIndicator) &&
                !(nodes[0] instanceof Picture) &&
                !(nodes[0] instanceof Code) &&
                nodes[0] instanceof Code &&
                !nodes[0].inline)
        ) {
            throw new Error(
                `Parameter nodes should be an array of Start|Stop|Text|Link|GetVar|Code(inline) and is: ${typeof nodes[0]}`
            );
        }
        for (let node of nodes) {
            if (
                node instanceof Start ||
                node instanceof Stop ||
                node instanceof Span ||
                node instanceof Picture ||
                node instanceof BR ||
                node instanceof Text ||
                node instanceof Code ||
                node instanceof ParagraphIndicator
            ) {
                content += node.to_html();
            } else if (node instanceof Link) {
                content += node.to_html();
            } else if (node instanceof GetVar) {
                content += this.get_variable(node.content);
            } else {
                throw new Error(
                    "Impossible to handle this type of node: " +
                    node.constructor.name
                );
            }
        }
        return content;
    }

    safe(str) {
        let index = 0;
        let word = '';
        let specials = ["@", "(", "[", "{", "$", "*", "!", "'", "/", "_", "^", "%", "-", "#", "\\", "•"];
        while (index < str.length) {
            let char = str[index];
            let next = index + 1 < str.length ? str[index + 1] : null;
            let next_next = index + 2 < str.length ? str[index + 2] : null;
            let prev = index - 1 >= 0 ? str[index - 1] : null;
            // Glyphs - Trio
            if (
                char === "." &&
                next === "." &&
                next_next === "." &&
                prev !== "\\"
            ) {
                word += "…";
                index += 2;
            } else if (
                char === "=" &&
                next === "=" &&
                next_next === ">" &&
                prev !== "\\"
            ) {
                word += "&DoubleRightArrow;"; // ==>
                index += 2;
            } else if (
                char === "<" &&
                next === "=" &&
                next_next === "=" &&
                prev !== "\\"
            ) {
                word += "&DoubleLeftArrow;"; // <==
                index += 2;
                // Glyphs - Duo
            } else if (char === "-" && next === ">" && prev !== "\\") {
                word += "&ShortRightArrow;"; // ->
                index += 1;
            } else if (char === "<" && next === "-" && prev !== "\\") {
                word += "&ShortLeftArrow;"; // <-
                index += 1;
            } else if (char === "o" && next === "e" && prev !== "\\") {
                word += "&oelig;"; // oe
                index += 1;
            } else if (char === "O" && next === "E" && prev !== "\\") {
                word += "&OElig;"; // OE
                index += 1;
            } else if (char === "=" && next === "=" && prev !== "\\") {
                word += "&Equal;"; // ==
                index += 1;
            } else if (char === "!" && next === "=" && prev !== "\\") {
                word += "&NotEqual;"; // !=
                index += 1;
            } else if (char === ">" && next === "=" && prev !== "\\") {
                word += "&GreaterSlantEqual;"; // >=
                index += 1;
            } else if (char === "<" && next === "=" && prev !== "\\") {
                word += "&LessSlantEqual;"; // <=
                index += 1;
                // Glyph - solo
            } else if (char === '&') {
                word += '&amp;';
            } else if (char === '<') {
                word += '&lt;';
            } else if (char === '>') {
                word += '&gt;';
                // Escaping
            } else if (char === "\\" && specials.includes(next)) {
                // Do nothing, this is an escaping slash
                if (next === "\\") {
                    word += "\\";
                    index += 1;
                }
            } else {
                word += char;
            }
            index += 1;
        }
        return word;
    }

    to_html(header = false, skip_error = false) {
        let start_time = new Date();
        let content = "";
        if (header) {
            content = `<!DOCTYPE HTML>\n<html lang="${this.get_variable("LANG", "en")}">
<head>
  <meta charset="${this.get_variable("ENCODING", "utf-8")}">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${this.get_variable("TITLE", "Undefined title")}</title>
  <link rel="icon" href="${this.get_variable(
                "ICON",
                "Undefined icon"
            )}" type="image/x-icon" />
  <link rel="shortcut icon" href="https://xitog.github.io/dgx/img/favicon.ico" type="image/x-icon" />\n`;
            // For CSS
            if (this.required.length > 0) {
                for (let req of this.required) {
                    if (req.endsWith(".css")) {
                        content += `  <link href="${req}" rel="stylesheet">\n`;
                    }
                }
            }
            if (this.css.length > 0) {
                content += '  <style type="text/css">\n';
                for (let cs of this.css) {
                    content += "    " + cs + "\n";
                }
                content += "  </style>\n";
            }
            // For javascript
            if (this.required.length > 0) {
                for (let req of this.required) {
                    if (req.endsWith(".js")) {
                        content += `  <script src="${req}"></script>\n`;
                    } else if (req.endsWith(".mjs")) {
                        content += `  <script type="module" src="${req}"></script>\n`;
                    }
                }
            }
            content += "</head>\n";
            let bid = this.get_variable("BODY_ID", "");
            let sbid = bid != null && bid != "" ? ` id="${bid}"` : '';
            let bclass = this.get_variable("BODY_CLASS", "");
            let sbclass = bclass != null && bclass != "" ? ` class="${bclass}"` : '';
            content += `<body${sbid}${sbclass}>\n`;
        }
        let first_text = true;
        let not_processed = 0;
        let types_not_processed = [];
        // Table
        let in_table = false;
        // List
        let stack = [];
        // Paragraph
        let in_paragraph = false;
        let in_def_list = false;
        let in_code_block = false;
        let in_quote_block = false;
        for (const node of this.nodes) {
            // Consistency
            if (!(node instanceof TextLine) && in_paragraph) {
                content += "</p>\n";
                in_paragraph = false;
            }
            if (!(node instanceof Definition) && in_def_list) {
                content += "</dl>\n";
                in_def_list = false;
            }
            if (!(node instanceof Row) && in_table) {
                content += "</table>\n";
                in_table = false;
            }

            // Handling of nodes
            if (node.constructor.name === "EmptyNode") {
                // Nothing, it is just too close the paragraph, done above.
            } else if (node instanceof Include) {
                let file = fs.readFileSync(node.content);
                content += file + "\n";
            } else if (node instanceof Title) {
                let contentAsString = this.string_to_html("", node.content);
                content += `<h${node.level} id="${this.make_anchor(
                    contentAsString
                )}">${contentAsString}</h${node.level}>\n`;
            } else if (node instanceof Comment) {
                if (this.get_variable("EXPORT_COMMENT")) {
                    content += "<!--" + node.content + " -->\n";
                }
            } else if (node instanceof SetVar) {
                this.set_variable(
                    node.id,
                    node.value,
                    node.type,
                    node.constant
                );
            } else if (
                node instanceof HR ||
                node instanceof StartDiv ||
                node instanceof EndDiv ||
                node instanceof StartDetail ||
                node instanceof EndDetail ||
                node instanceof Detail ||
                node instanceof RawHTML ||
                node instanceof ElementList ||
                node instanceof Quote ||
                node instanceof Code
            ) {
                content += node.to_html();
            } else if (node instanceof TextLine) {
                // Check that ParagraphIndicator must be only at 0
                for (let nc = 0; nc < node.children.length; nc++) {
                    if (
                        node.children[nc] instanceof ParagraphIndicator &&
                        nc > 0
                    ) {
                        throw new Error(
                            "A paragraph indicator must always be at the start of a text line"
                        );
                    }
                }
                if (!in_paragraph) {
                    in_paragraph = true;
                    // If the first child is a pragraph indicator, don't start the paragraph !
                    if (
                        node.children.length > 0 &&
                        !(node.children[0] instanceof ParagraphIndicator)
                    ) {
                        let c = this.get_variable("DEFAULT_PARAGRAPH_CLASS", "");
                        let cs = c != null && c != "" ? ` class="${c}"` : "";
                        content += `<p${cs}>`;
                    }
                } else {
                    content += "<br>\n"; // Chaque ligne donnera une ligne avec un retour à la ligne
                }
                content += node.to_html();
            } else if (node instanceof Definition) {
                if (!in_def_list) {
                    in_def_list = true;
                    content += "<dl>\n";
                }
                content += "<dt>";
                content = this.string_to_html(content, node.header) + "</dt>\n";
                content += "<dd>";
                if (this.get_variable("PARAGRAPH_DEFINITION") === true)
                    content += "<p>";
                content = this.string_to_html(content, node.content);
                if (this.get_variable("PARAGRAPH_DEFINITION") === true)
                    content += "</p>";
                content += "</dd>\n";
            } else if (node instanceof Row) {
                if (!in_table) {
                    in_table = true;
                    // Try to get a class. NEXT > DEFAULT
                    let c = this.get_variable("NEXT_TABLE_CLASS", "");
                    if (c === null || c == "") {
                        c = this.get_variable("DEFAULT_TABLE_CLASS", "");
                    } else {
                        this.set_variable("NEXT_TABLE_CLASS", null); // reset if found
                    }
                    let cs = c != null && c !== "" ? ` class="${c}"` : "";
                    // Try to get an id
                    let i1 = this.get_variable("NEXT_TABLE_ID", "");
                    if (i1 != null && i1 !== "") {
                        this.set_variable("NEXT_TABLE_ID", null); // reset if found
                    }
                    let i1s = i1 != null && i1 != "" ? ` id="${i1}"` : "";
                    content += `<table${i1s}${cs}>\n`;
                }
                content += "<tr>";
                let delim = node.is_header ? "th" : "td";
                for (let node_list of node.node_list_list) {
                    let center = "";
                    let span = "";
                    if (
                        node_list.length > 0 &&
                        node_list[0] instanceof Node && // for content
                        node_list[0].content.length > 0 &&
                        node_list[0].content[0] === "="
                    ) {
                        node_list[0].content =
                            node_list[0].content.substring(1);
                        center = ' style="text-align: center"';
                    } else if (
                        node_list.length > 0 &&
                        node_list[0] instanceof Node && // for content
                        node_list[0].content.length > 0 &&
                        node_list[0].content[0] === ">"
                    ) {
                        node_list[0].content =
                            node_list[0].content.substring(1);
                        center = ' style="text-align: right"';
                    }
                    if (node_list.length > 0 &&
                        node_list[0] instanceof Node &&
                        node_list[0].content.length > 2 &&
                        node_list[0].content[0] === "#"
                    ) {
                        if (node_list[0].content[1] === 'c') {
                            span = ' colspan="';
                        } else if (node_list[0].content[1] === 'r') {
                            span = ' rowspan="';
                        }
                        if (span !== '') {
                            let i = 2;
                            let found = false;
                            while (i < node_list[0].content.length) {
                                if (node_list[0].content[i] === '#') {
                                    found = true;
                                    break;
                                }
                                i += 1;
                            }
                            if (!found) {
                                span = '';
                            } else {
                                span += node_list[0].content.substring(2, i) + '"';
                                node_list[0].content = node_list[0].content.substring(i + 1);
                            }
                        }
                    }
                    content += `<${delim}${center}${span}>`;
                    content = this.string_to_html(content, node_list);
                    content += `</${delim}>`;
                }
                content += "</tr>\n";
            } else if (skip_error) {
                not_processed += 1;
                if (!(types_not_processed.includes(node.constructor.name))) {
                    types_not_processed[node.constructor.name] = 0;
                }
                types_not_processed[node.constructor.name] += 1;
            } else {
                throw new Error(`Unknown node: ${node.constructor.name}`);
            }
        }
        if (in_paragraph) {
            content += "</p>\n";
        }
        if (stack.length > 0) {
            content = this.assure_list_consistency(
                content,
                stack,
                0,
                null,
                null
            );
        }
        if (in_table) {
            content += "</table>\n";
        }
        if (in_quote_block) {
            content += "</blockquote>\n";
        }
        if (in_code_block) {
            content += "</pre>\n";
        }
        if (in_def_list) {
            content += "</dl>\n";
        }
        if (!first_text) {
            content += "</p>\n";
        }
        if (header) {
            content += "\n  </body>\n</html>";
        }
        console.log(
            "\nRoot nodes processed:",
            this.nodes.length - not_processed,
            "/",
            this.nodes.length
        );
        if (not_processed > 0) {
            console.log(`Nodes not processed ${not_processed}:`);
            for (let [k, v] of Object.entries(types_not_processed)) {
                console.log("   -", k, v);
            }
        }
        let end_time = new Date();
        let elapsed = (end_time - start_time) / 1000;
        console.log("Processed in:        %ds", elapsed, "\n");
        return content;
    }

    to_s(level = 0, node = null, header = false) {
        let out = "";
        if (node === null || node === undefined) {
            if (header === true) {
                out +=
                    "\n------------------------------------------------------------------------\n";
                out += "Liste des nodes du document\n";
                out +=
                    "------------------------------------------------------------------------\n\n";
            }
            for (const n of this.nodes) {
                out += this.to_s(level, n);
            }
        } else {
            let info = "    " + node.toString();
            out += "    ".repeat(level) + info + "\n";
            if (node instanceof Composite) {
                for (const n of node.children) {
                    out += this.to_s(level + 1, n);
                }
            }
            if (node instanceof Row) {
                for (const n of node.node_list_list) {
                    out += this.to_s(level + 1, n);
                }
            }
        }
        return out;
    }
}

class Hamill {
    static get version() {
        return VERSION;
    }

    static process(string_or_filename) {
        // Try to read as a file name, if it fails, take it as a string
        let data = null;
        let name = null;
        if (fs !== null) {
            try {
                data = fs.readFileSync(string_or_filename, "utf-8");
                console.log(`Data read from file: ${string_or_filename}`);
                name = string_or_filename;
            } catch {
                // Nothing
            }
        }
        if (data === null) {
            data = string_or_filename;
            console.log('Raw string:');
            console.log(data.replace(/\n/g, '\\n') + "\n");
            console.log(`Data read from string:`);
        }
        data = data.replace(/\r\n/g, "\n");
        data = data.replace(/\r/g, "\n");
        // Display raw lines
        let lines = data.split("\n");
        for (let [index, line] of lines.entries()) {
            console.log(`    ${index + 1}. ${line.replace("\n", "<NL>")}`);
        }
        // Tag lines
        let tagged = Hamill.tag_lines(data.split("\n"));
        console.log("\nTagged Lines:");
        for (const [index, line] of tagged.entries()) {
            console.log(`    ${index + 1}. ${line}`);
        }
        // Make a document
        let doc = Hamill.parse_tagged_lines(tagged);
        doc.set_name(name);
        console.log("\nDocument:");
        console.log(doc.to_s());
        return doc;
    }

    // First pass: we tag all the lines
    static tag_lines(raw) {
        let lines = [];
        let next_is_def = false;
        let in_code_block = false; // only the first and the last line start with @@@
        let in_code_block_prefixed = false; // each line must start with @@
        let in_quote_block = false; // only the first and the last line start with >>>
        for (const value of raw) {
            let trimmed = value.trim();
            // Check states
            // End of prefixed block
            if (in_code_block_prefixed && !trimmed.startsWith('@@') && !trimmed.startsWith('@@@')) {
                in_code_block_prefixed = false;
                // Final line @@@ of a not prefixed block
            } else if (in_code_block && trimmed === '@@@') {
                in_code_block = false;
                continue;
            } else if (in_quote_block && trimmed === '>>>') {
                in_quote_block = false;
                continue;
            }

            // States handling
            if (in_code_block || in_code_block_prefixed) {
                lines.push(new Line(value, "code"));
            } else if (in_quote_block) {
                lines.push(new Line(value, "quote"));
            } else if (trimmed.length === 0) {
                lines.push(new Line("", "empty"));
                // Titles :
            } else if (trimmed[0] === "#") {
                lines.push(new Line(trimmed, "title"));
            }
            // HR :
            else if ((trimmed.match(/-/g) || []).length === trimmed.length) {
                lines.push(new Line("", "separator"));
            }
            // Lists, line with the first non empty character is "* " or "+ " or "- " :
            else if (trimmed.substring(0, 2) === "* ") {
                let start = value.indexOf("* ");
                let level = Math.trunc(start / 2);
                if (level * 2 !== start) {
                    throw new Error(
                        "Level list must be indented by a multiple of two"
                    );
                }
                lines.push(new Line(value, "unordered_list", level + 1));
            } else if (trimmed.substring(0, 2) === "+ ") {
                let start = value.indexOf("+ ");
                let level = Math.trunc(start / 2);
                if (level * 2 !== start) {
                    throw new Error(
                        "Level list must be indented by a multiple of two"
                    );
                }
                lines.push(new Line(value, "ordered_list", level + 1));
            } else if (trimmed.substring(0, 2) === "- ") {
                let start = value.indexOf("- ");
                let level = Math.trunc(start / 2);
                if (level * 2 !== start) {
                    throw new Error(
                        "Level list must be indented by a multiple of two"
                    );
                }
                lines.push(new Line(value, "reverse_list", level + 1));
            }
            // Keywords, line with the first non empty character is "!" :
            //     var, const, include, require, css, html, comment
            else if (trimmed.startsWith("!var ")) {
                lines.push(new Line(trimmed, "var"));
            } else if (trimmed.startsWith("!const ")) {
                lines.push(new Line(trimmed, "const"));
            } else if (trimmed.startsWith("!include ")) {
                lines.push(new Line(trimmed, "include"));
            } else if (trimmed.startsWith("!require ")) {
                lines.push(new Line(trimmed, "require"));
            } else if (trimmed.startsWith("!css ")) {
                lines.push(new Line(value, "css"));
            } else if (trimmed.startsWith("!html")) {
                lines.push(new Line(value, "html"));
            } else if (
                trimmed.startsWith("!rem") ||
                trimmed.substring(0, 2) === "§§"
            ) {
                lines.push(new Line(trimmed, "comment"));
            }
            // Block of code
            else if (trimmed.substring(0, 3) === "@@@") {
                in_code_block = true;
                lines.push(new Line(value, "code"));
            } else if (
                trimmed.substring(0, 2) === "@@" &&
                !trimmed.substring(2).includes("@@")
            ) {
                in_code_block_prefixed = true;
                lines.push(new Line(value, "code"));
            }
            // Block of quote
            else if (trimmed.substring(0, 3) === ">>>") {
                in_quote_block = true; // will be desactivate in Check states
                lines.push(new Line(value, "quote"));
            } else if (trimmed.substring(0, 2) === ">>") {
                lines.push(new Line(value, "quote"));
            }
            // Labels
            else if (trimmed.substring(0, 2) === "::") {
                lines.push(new Line(trimmed, "label"));
            }
            // Div (Si la ligne entière est {{ }}, c'est une div. On ne fait pas de span d'une ligne)
            else if (
                trimmed.substring(0, 2) === "{{" &&
                trimmed.substring(trimmed.length - 2) === "}}" &&
                trimmed.lastIndexOf("{{") == 0
            ) {
                // span au début et à la fin = erreur
                lines.push(new Line(trimmed, "div"));
                // Detail
            } else if (
                trimmed.substring(0, 2) === "<<" &&
                trimmed.substring(trimmed.length - 2) === ">>" &&
                trimmed.lastIndexOf("<<") == 0
            ) {
                lines.push(new Line(trimmed, "detail"))
                // Tables
            } else if (
                trimmed[0] === "|" &&
                trimmed[trimmed.length - 1] === "|"
            ) {
                lines.push(new Line(trimmed, "row"));
            }
            // Definition lists
            else if (trimmed.substring(0, 2) === "$ ") {
                lines.push(new Line(trimmed.substring(2), "definition-header"));
                next_is_def = true;
            } else if (!next_is_def) {
                lines.push(new Line(trimmed, "text"));
            } else {
                lines.push(new Line(trimmed, "definition-content"));
                next_is_def = false;
            }
        }
        return lines;
    }

    static escaped_split(sep, str) {
        let parts = [];
        let part = "";
        let index = 0;
        while (index < str.length) {
            let char = str[index];
            let try_sep = str.substring(index, index + sep.length);
            let next = (index + 1) < str.length ? str.substring(index + 1, index + 1 + sep.length) : "";
            if (try_sep === sep) {
                parts.push(part);
                part = "";
                index += sep.length - 1;

            } else if (char === "\\" && next === sep) {
                part += sep;
                index += sep.length;
            } else {
                part += char;
            }
            index += 1;
        }
        if (part.length > 0) {
            parts.push(part);
        }
        return parts;
    }

    // Take a list of tagged lines return a valid Hamill document
    static parse_tagged_lines(lines) {
        if (DEBUG) console.log(`\nProcessing ${lines.length} lines`);
        let doc = new Document();
        let definition = null;
        // Lists
        let actual_list = null;
        let actual_level = 0;
        let starting_level = 0;
        // On pourrait avoir un root aussi
        // Main loop
        let count = 0;
        while (count < lines.length) {
            let line = lines[count];
            let text = null;
            let id = null;
            let value = null;
            // List
            if (
                actual_list !== null &&
                line.type !== "unordered_list" &&
                line.type !== "ordered_list" &&
                line.type !== "reverse_list"
            ) {
                doc.add_node(actual_list.root());
                actual_list = null;
                actual_level = 0;
            }
            // Titles
            let lvl = 0;
            // Quotes
            let nodeContent = "";
            let free = false;
            // Lists
            let delimiters = {
                unordered_list: "* ",
                ordered_list: "+ ",
                reverse_list: "- ",
            };
            let delimiter = "";
            let list_level = 0;
            let elem_is_unordered = false;
            let elem_is_ordered = false;
            let elem_is_reverse = false;
            let item_text = "";
            let item_nodes = [];
            // Includes
            let include = "";
            // Rows
            let content = "";
            // Divs
            let res = null;
            switch (line.type) {
                case "title":
                    for (const char of line.value) {
                        if (char === "#") {
                            lvl += 1;
                        } else {
                            break;
                        }
                    }
                    text = line.value.substring(lvl).trim();
                    try {
                        let interpreted = Hamill.parse_inner_string(doc, text);
                        doc.add_node(new Title(doc, interpreted, lvl));
                        doc.add_label(
                            doc.make_anchor(text),
                            "#" + doc.make_anchor(text)
                        );
                    } catch (e) {
                        console.log(`Error at line ${count} on title: ${line}`);
                        throw e;
                    }
                    break;
                case "separator":
                    doc.add_node(new HR(doc));
                    break;
                case "text":
                    if (
                        line.value.trim().startsWith("\\* ") ||
                        line.value.trim().startsWith("\\!html") ||
                        line.value.trim().startsWith("\\!var") ||
                        line.value.trim().startsWith("\\!const") ||
                        line.value.trim().startsWith("\\!include") ||
                        line.value.trim().startsWith("\\!require")
                    ) {
                        line.value = line.value.trim().substring(1);
                    }
                    try {
                        let n = Hamill.parse_inner_string(doc, line.value);
                        doc.add_node(new TextLine(doc, n));
                    } catch (e) {
                        console.log(`Error at line ${count} on text: ${line}`);
                        throw e;
                    }
                    break;
                case "unordered_list":
                    elem_is_unordered = true;
                    if (actual_list === null) {
                        actual_list = new ElementList(doc, null, false, false);
                        actual_level = 1;
                        starting_level = line.param;
                    }
                // next
                case "ordered_list":
                    if (line.type === "ordered_list") elem_is_ordered = true;
                    if (actual_list === null) {
                        actual_list = new ElementList(doc, null, true, false);
                        actual_level = 1;
                        starting_level = line.param;
                    }
                // next
                case "reverse_list":
                    if (line.type === "reverse_list") elem_is_reverse = true;
                    if (actual_list === null) {
                        actual_list = new ElementList(doc, null, true, true);
                        actual_level = 1;
                        starting_level = line.param;
                    }
                    // common code
                    // compute item level
                    delimiter = delimiters[line.type];
                    list_level = line.param; //Math.floor(line.value.indexOf(delimiter) / 2) + 1;
                    // check coherency with the starting level
                    if (list_level < starting_level) {
                        throw new Error(
                            "Coherency error: a following item of list has a lesser level than its starting level."
                        );
                    } else {
                        list_level = list_level - (starting_level - 1);
                    }
                    // coherency
                    if (list_level === actual_level) {
                        if (
                            (elem_is_unordered &&
                                (actual_list.ordered || actual_list.reverse)) ||
                            (elem_is_ordered && !actual_list.ordered) ||
                            (elem_is_reverse && !actual_list.reverse)
                        ) {
                            throw new Error(
                                `Incoherency with previous item ${actual_level} at this level ${list_level}: ul:${elem_is_unordered} ol:${elem_is_unordered} r:${elem_is_reverse} vs o:${actual_list.ordered} r:${actual_list.reverse}`
                            );
                        }
                    }
                    while (list_level > actual_level) {
                        let last = actual_list.pop(); // get and remove the last item
                        let c = new Composite(doc, actual_list); // create a new composite
                        c.add_child(last); // put the old last item in it
                        actual_list = actual_list.add_child(c); // link the new composite to the list
                        let sub = new ElementList(
                            doc,
                            c,
                            elem_is_ordered,
                            elem_is_reverse
                        ); // create a new list
                        actual_list = actual_list.add_child(sub);
                        actual_level += 1;
                    }
                    while (list_level < actual_level) {
                        actual_list = actual_list.get_parent();
                        if (actual_list.constructor.name === "Composite") {
                            // L'item était un composite, il faut remonter à la liste mère !
                            actual_list = actual_list.get_parent();
                        }
                        actual_level -= 1;
                        if (actual_list.constructor.name !== "ElementList") {
                            throw new Error(
                                `List incoherency: last element is not a list but a ${actual_list.constructor.name}`
                            );
                        }
                    }
                    // creation
                    item_text = line.value
                        .substring(line.value.indexOf(delimiter) + 2)
                        .trim();
                    item_nodes = Hamill.parse_inner_string(doc, item_text);
                    actual_list.add_child(new TextLine(doc, item_nodes));
                    break;
                case "html":
                    doc.add_node(
                        new RawHTML(
                            doc,
                            line.value.replace("!html ", "").trimEnd()
                        )
                    );
                    break;
                case "css":
                    text = line.value.replace("!css ", "").trimEnd();
                    doc.add_css(text);
                    break;
                case "include":
                    include = line.value.replace("!include ", "").trim();
                    doc.add_node(new Include(doc, include));
                    break;
                case "require":
                    text = line.value.replace("!require ", "").trim();
                    doc.add_required(text);
                    break;
                case "const":
                    text = line.value.replace("!const ", "").split("=");
                    id = text[0].trim();
                    value = text[1].trim();
                    doc.set_variable(id, value, "string", true);
                    break;
                case "var":
                    text = line.value.replace("!var ", "").split("=");
                    id = text[0].trim();
                    value = text[1].trim();
                    if (value === "true") value = true;
                    if (value === "TRUE") value = true;
                    if (value === "false") value = false;
                    if (value === "FALSE") value = false;
                    doc.add_node(new SetVar(doc, id, value, typeof value === "boolean" ? "boolean" : "string", false));
                    break;
                case "label":
                    value = line.value.replace(/::/, "").trim(); // Remove only the first
                    text = value.split("::");
                    doc.add_label(text[0].trim(), text[1].trim()); // label, url
                    break;
                case "detail":
                    value = line.value
                        .substring(2, line.value.length - 2)
                        .trim();
                    if (value === "end") {
                        doc.add_node(new EndDetail(doc));
                    } else {
                        let parts = value.split("->");
                        let res = Hamill.parse_inner_markup(parts[0]);
                        if (
                            parts.length === 1 ||
                            parts[1].trim().length === 0
                        ) {
                            doc.add_node(
                                new StartDetail(
                                    doc,
                                    res["text"].trim(),
                                    res["id"],
                                    res["class"]
                                )
                            );
                        } else {
                            // Detail simple <<summary -> content>>
                            doc.add_node(
                                new Detail(
                                    doc,
                                    res["text"].trim(),
                                    parts[1].trim(),
                                    res["id"],
                                    res["class"]
                                )
                            );
                        }
                    }
                    break;
                case "div":
                    value = line.value
                        .substring(2, line.value.length - 2)
                        .trim();
                    res = Hamill.parse_inner_markup(value);
                    if (res["text"] === "end") {
                        doc.add_node(new EndDiv(doc)); // We can put {{end .myclass #myid}} but it has no meaning except to code reading
                    } else if (
                        res["has_only_text"] &&
                        res["text"] !== "begin"
                    ) {
                        console.log(res);
                        throw new Error(
                            `Unknown quick markup: ${res["text"]} in ${line}`
                        );
                    } else if (
                        res["text"] === "begin" ||
                        res["text"] === null
                    ) {
                        // begin can be omitted if there is no class nor id
                        doc.add_node(
                            new StartDiv(doc, res["id"], res["class"])
                        );
                    }
                    break;
                case "comment":
                    if (line.value.startsWith("!rem ")) {
                        doc.add_node(new Comment(doc, line.value.substring(4)));
                    } else {
                        doc.add_node(new Comment(doc, line.value.substring(2)));
                    }
                    break;
                case "row":
                    content = line.value.substring(
                        1,
                        line.value.length - 1
                    );
                    if (
                        content.length ===
                        (content.match(/[-|]/g) || []).length
                    ) {
                        let i = doc.nodes.length - 1;
                        while (doc.get_node(i) instanceof Row) {
                            doc.get_node(i).is_header = true;
                            i -= 1;
                        }
                    } else {
                        let parts = this.escaped_split("|", content); // Handle escape
                        let all_nodes = [];
                        for (let p of parts) {
                            let nodes = Hamill.parse_inner_string(doc, p);
                            all_nodes.push(nodes);
                        }
                        doc.add_node(new Row(doc, all_nodes));
                    }
                    break;
                case "empty":
                    // Prevent multiple empty nodes
                    if (
                        doc.nodes.length === 0 ||
                        doc.nodes[doc.nodes.length - 1].constructor.name !==
                        "EmptyNode"
                    ) {
                        doc.add_node(new EmptyNode(doc));
                    }
                    break;
                case "definition-header":
                    definition = Hamill.parse_inner_string(doc, line.value);
                    break;
                case "definition-content":
                    if (definition === null) {
                        throw new Error(
                            "Definition content without header: " + line.value
                        );
                    }
                    doc.add_node(
                        new Definition(
                            doc,
                            definition,
                            Hamill.parse_inner_string(doc, line.value)
                        )
                    );
                    definition = null;
                    break;
                case "quote":
                    res = {};
                    res['class'] = null;
                    res['id'] = null;
                    if (line.value === ">>>") {
                        free = true;
                        count += 1;
                    } else if (line.value.startsWith(">>>")) {
                        free = true;
                        res = this.parse_inner_markup(line.value.substring(3));
                        if (res["has_text"]) {
                            throw new Error("A line starting a blockquote should only have a class or id indication not text");
                        }
                        count += 1;
                    }
                    while (count < lines.length && lines[count].type === "quote") {
                        line = lines[count];
                        if (!free && !line.value.startsWith(">>")) {
                            break;
                        } else if (free && line.value === ">>>") {
                            break;
                        } else if (!free) {
                            nodeContent += line.value.substring(2) + "\n";
                        } else {
                            nodeContent += line.value + "\n";
                        }
                        count += 1;
                    }
                    doc.add_node(new Quote(doc, nodeContent, res['class'], res['id']));
                    if (count < lines.length && lines[count].type !== "quote") {
                        count -= 1;
                    }
                    break;
                case "code":
                    if (line.value === "@@@") {
                        free = true;
                        count += 1;
                    } else if (line.value.startsWith("@@@")) {
                        free = true;
                        res = line.value.substring(3); // this.parse_inner_markup(
                        count += 1;
                    } else if (line.value.startsWith("@@")) {
                        res = line.value.substring(2);
                        if (res in LANGUAGES) {
                            count += 1; // skip
                        }
                    }
                    while (count < lines.length && lines[count].type === "code") {
                        line = lines[count];
                        if (!free && !line.value.startsWith("@@")) {
                            break;
                        } else if (free && line.value === "@@@") {
                            break;
                        } else if (!free) {
                            nodeContent += line.value.substring(2) + "\n";
                        } else {
                            nodeContent += line.value + "\n";
                        }
                        count += 1;
                    }
                    doc.add_node(new Code(doc, nodeContent, null, null, res, false)); // res is the language
                    if (count < lines.length && lines[count].type !== "code") {
                        count -= 1;
                    }
                    break;
                default:
                    throw new Error(`Unknown ${line.type}`);
            }
            count += 1;
        }
        // List
        if (actual_list !== null) {
            doc.add_node(actual_list.root());
        }
        return doc;
    }

    // Find a pattern in a string. Pattern can be any character wide. Won't find any escaped pattern \pattern but will accept double escaped \\pattern
    static find(str, start, pattern) {
        // String not big enough to have the motif
        if (pattern.length > str.slice(start).length) {
            return -1;
        }
        for (let i = start; i < str.length; i++) {
            if (str.slice(i, i + pattern.length) === pattern) {
                if (
                    (i - 1 < start)
                    || (i - 1 >= start && str[i - 1] !== "\\")
                    || (i - 2 < start)
                    || (i - 2 >= start && str[i - 1] === "\\" && str[i - 2] === "\\")) {
                    return i;
                }
            }
        }
        return -1;
    }

    static unescape_code(str) {
        let res = "";
        let i = 0;
        while (i < str.length) {
            const char = str[i];
            const next = i + 1 < str.length ? str[i + 1] : "";
            if (char === "\\" && next === '@') {
                res += "@";
                i += 1;
            } else if (char === "\\" && next === "\\") {
                res += "\\";
                i += 1;
            } else {
                res += char;
            }
            i += 1;
        }
        return res;
    }

    static parse_inner_string(doc, str) {
        let index = 0;
        let word = "";
        let nodes = [];
        let matches = [
            ["@", "@", "code"],
            ["(", "(", "picture"],
            ["[", "[", "link"],
            ["{", "{", "markup"],
            ["$", "$", "echo"],
            ["*", "*", "bold"],
            ["!", "!", "strong"],
            ["'", "'", "italic"],
            ["/", "/", "em"],
            ["_", "_", "underline"],
            ["^", "^", "sup"],
            ["%", "%", "sub"],
            ["-", "-", "stroke"],
        ];
        let modes = {
            bold: false,
            strong: false,
            italic: false,
            em: false,
            underline: false,
            sup: false,
            sub: false,
            stroke: false,
        };
        let text_modifier_stack = [];

        while (index < str.length) {
            let char = str[index];
            let next = index + 1 < str.length ? str[index + 1] : null;
            let next_next = index + 2 < str.length ? str[index + 2] : null;
            let prev = index - 1 >= 0 ? str[index - 1] : null;
            // Remplacement des glyphes
            // Glyphs - Quatuor
            if (
                char === "#" &&
                next === "#" &&
                prev !== "\\"
            ) {
                if (word.length > 0) {
                    nodes.push(
                        new Text(doc, word.substring(0, word.length).trim())
                    );
                    word = "";
                }
                nodes.push(new BR(doc));
                index += 1; // set on the second #
                // in case of a ## b, the first space is removed by trim() above
                // and the second space by this :
                if (index + 1 < str.length && str[index + 1] === ' ') {
                    index += 1;
                }
            } else if (char === "\\" && next === "\\" && next_next === "\\") {
                // escape it
                word += "\\\\";
                index += 4;
            }
            // Text Styles
            else {
                let match = null;
                for (let pattern of matches) {
                    if (
                        char === pattern[0] &&
                        next === pattern[1] &&
                        prev !== "\\"
                    ) {
                        match = pattern[2];
                        break;
                    }
                }
                if (match !== null) {
                    if (word.length > 0) {
                        nodes.push(new Text(doc, word));
                        word = "";
                    }
                    if (match === "picture") {
                        let end = str.indexOf("))", index);
                        if (end === -1) {
                            throw new Error(`Unclosed image in ${str}`);
                        }
                        let content = str.substring(index + 2, end);
                        let res = Hamill.parse_inner_picture(content);
                        nodes.push(
                            new Picture(
                                doc,
                                res["url"],
                                res["text"],
                                res["class"],
                                res["id"]
                            )
                        );
                        index = end + 1;
                    } else if (match === "link") {
                        let end = str.indexOf("]]", index);
                        if (end === -1) {
                            throw new Error(`Unclosed link in ${str}`);
                        }
                        let content = str.substring(index + 2, end);
                        let parts = Hamill.escaped_split("->", content);
                        let display = null;
                        let url = null;
                        if (parts.length === 1) {
                            url = parts[0].trim();
                        } else if (parts.length === 2) {
                            display = Hamill.parse_inner_string(
                                doc,
                                parts[0].trim()
                            );
                            url = parts[1].trim();
                        } else if (parts.length > 2) {
                            throw new Error(`Malformed link: ${content}`);
                        }
                        nodes.push(new Link(doc, url, display));
                        index = end + 1;
                    } else if (match === "markup") {
                        let end = str.indexOf("}}", index);
                        if (end === -1) {
                            throw new Error(`Unclosed markup in ${str}`);
                        }
                        let content = str.substring(index + 2, end);
                        let res = Hamill.parse_inner_markup(content);
                        if (res["has_text"]) {
                            nodes.push(
                                new Span(
                                    doc,
                                    Hamill.parse_inner_string(doc, res["text"]), // New
                                    res["id"],
                                    res["class"]
                                )
                            );
                        } else {
                            nodes.push(
                                new ParagraphIndicator(
                                    doc,
                                    res["id"],
                                    res["class"]
                                )
                            );
                        }
                        index = end + 1;
                    } else if (match === "echo") {
                        let end = str.indexOf("$$", index + 2);
                        if (end === -1) {
                            throw new Error(`Unclosed display in ${str}`);
                        }
                        let content = str.substring(index + 2, end);
                        nodes.push(new GetVar(doc, content));
                        index = end + 1;
                    } else if (match === "code") {
                        let is_code_ok = Hamill.find(str, index + 2, "@@");
                        if (is_code_ok === -1) {
                            throw new Error(
                                "Unfinished inline code sequence: " + str
                            );
                        }
                        let code_str = str.slice(index + 2, is_code_ok);
                        let lang = null;
                        let language = code_str.split(" ")[0];
                        if (language in LANGUAGES) {
                            lang = language;
                            code_str = code_str.substring(language.length + 1); // remove the language and one space
                        }
                        nodes.push(new Code(doc, Hamill.unescape_code(code_str), null, null, lang, true)); // unescape only @@ !
                        index = is_code_ok + 1; // will inc by 1 at the end of the loop
                    } else {
                        // match with text modes
                        if (!modes[match]) {
                            modes[match] = true;
                            text_modifier_stack.push([match, str]);
                            nodes.push(new Start(doc, match));
                        } else {
                            modes[match] = false;
                            let last = text_modifier_stack.pop();
                            let last_mode = last[0];
                            if (last_mode != match) {
                                throw new Error(`Incoherent stacking of the modifier: finishing ${match} but ${last_mode} should be closed first in ${last[1]}`);
                            }
                            nodes.push(new Stop(doc, match));
                        }
                        index += 1;
                    }
                } // no match
                else {
                    word += char;
                }
            }
            index += 1;
        }
        if (word.length > 0) {
            nodes.push(new Text(doc, word));
        }
        if (text_modifier_stack.length > 0) {
            let last = text_modifier_stack.pop();
            throw new Error(`Unclosed ${last[0]} text mode in ${last[1]}.`);
        }
        return nodes;
    }

    static parse_inner_picture(content) {
        let res = null;
        let parts = content.split("->");
        if (parts.length === 1) {
            return {
                has_text: false,
                has_only_text: false,
                class: null,
                id: null,
                text: null,
                url: parts[0],
            };
        } else {
            content = parts[0];
            res = Hamill.parse_inner_markup(content);
            res["url"] = parts[1].trim();
        }
        return res;
    }

    static parse_inner_markup(content) {
        let cls = null;
        let in_class = false;
        let ids = null;
        let in_ids = false;
        let text = null;
        let in_text = false;
        for (let c of content) {
            if (
                c === "." &&
                in_class === false &&
                in_ids === false &&
                in_text === false &&
                cls === null &&
                text === null
            ) {
                in_class = true;
                cls = "";
                continue;
            }

            if (
                c === "#" &&
                in_class === false &&
                in_ids === false &&
                in_text === false &&
                ids === null &&
                text === null
            ) {
                in_ids = true;
                ids = "";
                continue;
            }

            if (c === " " && in_class) {
                in_class = false;
            }

            if (c === " " && in_ids) {
                in_ids = false;
            }

            if (
                c !== " " &&
                in_class === false &&
                in_ids === false &&
                in_text === false &&
                text === null
            ) {
                in_text = true;
                text = "";
            }

            if (in_class) {
                cls += c;
            } else if (in_ids) {
                ids += c;
            } else if (in_text) {
                text += c;
            }
        }
        let has_text = text !== null;
        let has_only_text =
            has_text && cls === null && ids === null;
        return {
            has_text: has_text,
            has_only_text: has_only_text,
            class: cls,
            id: ids,
            text: text,
        };
    }
}

//-----------------------------------------------------------------------------
// Functions
//-----------------------------------------------------------------------------

let tests = [
    // Comments, HR and BR
    ["!rem This is a comment", ""],
    ["§§ This is another comment", ""],
    [
        "!var EXPORT_COMMENT=true\n!rem This is a comment",
        "<!-- This is a comment -->\n",
    ],
    [
        "!var EXPORT_COMMENT=true\n§§ This is a comment",
        "<!-- This is a comment -->\n",
    ],
    ["---", "<hr>\n"],
    ["a ## b", "<p>a<br>b</p>\n"],
    ["a ##", "<p>a<br></p>\n"],
    ["a ##b ##", "<p>a<br>b<br></p>\n"],
    ["livre : ##\nchanceux ##", "<p>livre :<br><br>\nchanceux<br></p>\n"],
    // Titles
    ["### Title 3", '<h3 id="title-3">Title 3</h3>\n'],
    ["#Title 1", '<h1 id="title-1">Title 1</h1>\n'],
    // Paragraph
    ["a", "<p>a</p>\n"],
    ["a\n\n\n", "<p>a</p>\n"],
    ["a\nb\n\n", "<p>a<br>\nb</p>\n"],
    // Text modifications
    ["**bonjour**", "<p><b>bonjour</b></p>\n"],
    ["''italic''", "<p><i>italic</i></p>\n"],
    ["--strikethrough--", "<p><s>strikethrough</s></p>\n"],
    ["__underline__", "<p><u>underline</u></p>\n"],
    ["^^superscript^^", "<p><sup>superscript</sup></p>\n"],
    ["%%subscript%%", "<p><sub>subscript</sub></p>\n"],
    ["@@code@@", "<p><code>code</code></p>\n"],
    ["!!ceci est strong!!", "<p><strong>ceci est strong</strong></p>\n"],
    ["//ceci est emphase//", "<p><em>ceci est emphase</em></p>\n"],
    // Escaping
    ["\\**bonjour\\**", "<p>**bonjour**</p>\n"],
    [
        "@@code \\@@variable = '\\n' end@@",
        "<p><code>code @@variable = '\\n' end</code></p>\n",
    ],
    // Div, p and span
    ["{{#myid .myclass}}", '<div id="myid" class="myclass">\n'],
    ["{{#myid}}", '<div id="myid">\n'],
    ["{{.myclass}}", '<div class="myclass">\n'],
    ["{{begin}}", "<div>\n"],
    ["{{end}}", "</div>\n"],
    [
        "{{#myid .myclass}}content",
        '<p id="myid" class="myclass">content</p>\n',
    ],
    [
        "{{#myid}}content",
        '<p id="myid">content</p>\n'],
    [
        "{{.myclass}}content",
        '<p class="myclass">content</p>\n'],
    [
        "je suis {{#myid .myclass rouge}} et oui !",
        '<p>je suis <span id="myid" class="myclass">rouge</span> et oui !</p>\n',
    ],
    [
        "je suis {{#myid rouge}} et oui !",
        '<p>je suis <span id="myid">rouge</span> et oui !</p>\n',
    ],
    [
        "je suis {{.myclass rouge}} et oui !",
        '<p>je suis <span class="myclass">rouge</span> et oui !</p>\n',
    ],
    [
        "!var DEFAULT_PARAGRAPH_CLASS=zorba\nvive le rouge !",
        '<p class="zorba">vive le rouge !</p>\n'
    ],
    // Details
    [
        "<<small -> petit>>",
        "<details><summary>small</summary>petit</details>\n",
    ],
    [
        "<<.reddetail small -> petit>>",
        `<details class="reddetail"><summary>small</summary>petit</details>\n`,
    ],
    [
        "<<#mydetail small -> petit>>",
        `<details id="mydetail"><summary>small</summary>petit</details>\n`,
    ],
    [
        "<<.reddetail #mydetail small -> petit>>",
        `<details id="mydetail" class="reddetail"><summary>small</summary>petit</details>\n`,
    ],
    [
        "<<big>>\n* This is very big!\n* Indeed\n<<end>>",
        "<details><summary>big</summary>\n<ul>\n  <li>This is very big!</li>\n  <li>Indeed</li>\n</ul>\n</details>\n",
    ],
    [
        "<<.mydetail big>>\n* This is very big!\n* Indeed\n<<end>>",
        `<details class="mydetail"><summary>big</summary>\n<ul>\n  <li>This is very big!</li>\n  <li>Indeed</li>\n</ul>\n</details>\n`,
    ],
    [
        "<<#reddetail big>>\n* This is very big!\n* Indeed\n<<end>>",
        `<details id="reddetail"><summary>big</summary>\n<ul>\n  <li>This is very big!</li>\n  <li>Indeed</li>\n</ul>\n</details>\n`,
    ],
    [
        "<<#reddetail .mydetail big>>\n* This is very big!\n* Indeed\n<<end>>",
        `<details id="reddetail" class="mydetail"><summary>big</summary>\n<ul>\n  <li>This is very big!</li>\n  <li>Indeed</li>\n</ul>\n</details>\n`,
    ],
    // Code
    [
        "@@code@@",
        "<p><code>code</code></p>\n"
    ],
    [
        "Été @@2006@@ Mac, Intel, Mac OS X",
        "<p>Été <code>2006</code> Mac, Intel, Mac OS X</p>\n"
    ],
    [
        "Voici du code : @@if a == 5 then puts('hello 5') end@@",
        "<p>Voici du code : <code>if a == 5 then puts('hello 5') end</code></p>\n",
    ],
    [
        "Voici du code Ruby : @@ruby if a == 5 then puts('hello 5') end@@",
        `<p>Voici du code Ruby : <code><span class="ruby-keyword" title="token n°0 : keyword">if</span> <span class="ruby-identifier" title="token n°2 : identifier">a</span> <span class="ruby-operator" title="token n°4 : operator">==</span> <span class="ruby-integer" title="token n°6 : integer">5</span> <span class="ruby-keyword" title="token n°8 : keyword">then</span> <span class="ruby-identifier" title="token n°10 : identifier">puts</span><span class="ruby-separator" title="token n°11 : separator">(</span><span class="ruby-string" title="token n°12 : string">'hello 5'</span><span class="ruby-separator" title="token n°13 : separator">)</span> <span class="ruby-keyword" title="token n°15 : keyword">end</span></code></p>\n`,
    ],
    [
        "@@ruby\n@@if a == 5 then\n@@    puts('hello 5')\n@@end\n",
        `<pre>
<span class="ruby-keyword" title="token n°0 : keyword">if</span> <span class="ruby-identifier" title="token n°2 : identifier">a</span> <span class="ruby-operator" title="token n°4 : operator">==</span> <span class="ruby-integer" title="token n°6 : integer">5</span> <span class="ruby-keyword" title="token n°8 : keyword">then</span><span class="ruby-newline" title="token n°9 : newline">
</span>    <span class="ruby-identifier" title="token n°11 : identifier">puts</span><span class="ruby-separator" title="token n°12 : separator">(</span><span class="ruby-string" title="token n°13 : string">'hello 5'</span><span class="ruby-separator" title="token n°14 : separator">)</span><span class="ruby-newline" title="token n°15 : newline">
</span><span class="ruby-keyword" title="token n°16 : keyword">end</span><span class="ruby-newline" title="token n°17 : newline">
</span></pre>\n`
    ],
    [
        "@@@ruby\nif a == 5 then\n    puts('hello 5')\nend\n@@@\n",
        `<pre>
<span class="ruby-keyword" title="token n°0 : keyword">if</span> <span class="ruby-identifier" title="token n°2 : identifier">a</span> <span class="ruby-operator" title="token n°4 : operator">==</span> <span class="ruby-integer" title="token n°6 : integer">5</span> <span class="ruby-keyword" title="token n°8 : keyword">then</span><span class="ruby-newline" title="token n°9 : newline">
</span>    <span class="ruby-identifier" title="token n°11 : identifier">puts</span><span class="ruby-separator" title="token n°12 : separator">(</span><span class="ruby-string" title="token n°13 : string">'hello 5'</span><span class="ruby-separator" title="token n°14 : separator">)</span><span class="ruby-newline" title="token n°15 : newline">
</span><span class="ruby-keyword" title="token n°16 : keyword">end</span><span class="ruby-newline" title="token n°17 : newline">
</span></pre>\n`
    ],
    // Quotes
    [
        ">>ceci est une quote\n>>qui s'étend sur une autre ligne\nText normal",
        "<blockquote>\nceci est une quote<br>\nqui s'étend sur une autre ligne<br>\n</blockquote>\n<p>Text normal</p>\n"
    ],
    [
        ">>>\nceci est une quote libre\nqui s'étend sur une autre ligne aussi\n>>>\nText normal",
        "<blockquote>\nceci est une quote libre<br>\nqui s'étend sur une autre ligne aussi<br>\n</blockquote>\n<p>Text normal</p>\n"
    ],
    [
        ">>>.redquote\nceci est une quote libre\nqui s'étend sur une autre ligne aussi\n>>>\nText normal",
        `<blockquote class="redquote">\nceci est une quote libre<br>\nqui s'étend sur une autre ligne aussi<br>\n</blockquote>\n<p>Text normal</p>\n`
    ],
    [
        ">>>#myquote\nceci est une quote libre\nqui s'étend sur une autre ligne aussi\n>>>\nText normal",
        `<blockquote id="myquote">\nceci est une quote libre<br>\nqui s'étend sur une autre ligne aussi<br>\n</blockquote>\n<p>Text normal</p>\n`
    ],
    [
        ">>>.redquote #myquote\nceci est une quote libre\nqui s'étend sur une autre ligne aussi\n>>>\nText normal",
        `<blockquote id="myquote" class="redquote">\nceci est une quote libre<br>\nqui s'étend sur une autre ligne aussi<br>\n</blockquote>\n<p>Text normal</p>\n`
    ],
    [
        ">>>.redquote #myquote OH NON DU TEXTE !\nceci est une quote libre\nqui s'étend sur une autre ligne aussi\n>>>\nText normal",
        `<blockquote id="myquote" class="redquote">\nceci est une quote libre<br>\nqui s'étend sur une autre ligne aussi<br>\n</blockquote>\n<p>Text normal</p>\n`,
        "A line starting a blockquote should only have a class or id indication not text"
    ],
    // Lists
    [
        "* Bloc1\n  * A\n  * B\n* Bloc2\n  * C",
        "<ul>\n  <li>Bloc1\n    <ul>\n      <li>A</li>\n      <li>B</li>\n    </ul>\n  </li>\n  <li>Bloc2\n    <ul>\n      <li>C</li>\n    </ul>\n  </li>\n</ul>\n",
    ],
    ["  * A", "<ul>\n  <li>A</li>\n</ul>\n"],
    // Definition lists
    [
        "$ alpha\nFirst letter of the greek alphabet",
        "<dl>\n<dt>alpha</dt>\n<dd>First letter of the greek alphabet</dd>\n</dl>\n"
    ],
    [
        "!var PARAGRAPH_DEFINITION=true\n$ alpha\nFirst letter of the greek alphabet",
        "<dl>\n<dt>alpha</dt>\n<dd><p>First letter of the greek alphabet</p></dd>\n</dl>\n"
    ],
    // Tables
    [
        "|abc|def|",
        "<table>\n<tr><td>abc</td><td>def</td></tr>\n</table>\n"
    ],
    [
        "|abc|=def|",
        `<table>\n<tr><td>abc</td><td style="text-align: center">def</td></tr>\n</table>\n`
    ],
    [
        "|abc|>def|",
        `<table>\n<tr><td>abc</td><td style="text-align: right">def</td></tr>\n</table>\n`
    ],
    [
        "|abc|def\\|ghk|",
        "<table>\n<tr><td>abc</td><td>def|ghk</td></tr>\n</table>\n"
    ],
    [
        "!const DEFAULT_TABLE_CLASS=alpha\n|abc|def|",
        '<table class="alpha">\n<tr><td>abc</td><td>def</td></tr>\n</table>\n'
    ],
    [
        "!const DEFAULT_TABLE_CLASS=alpha\n!const NEXT_TABLE_CLASS=beta\n|abc|def|\n\n|ghi|jkl|",
        '<table class="beta">\n<tr><td>abc</td><td>def</td></tr>\n</table>\n<table class="alpha">\n<tr><td>ghi</td><td>jkl</td></tr>\n</table>\n'
    ],
    // Links
    [
        "[[https://www.spotify.com/]]",
        `<p><a href="https://www.spotify.com/">https://www.spotify.com/</a></p>\n`
    ],
    [
        "[[Spotify->https://www.spotify.com/]]",
        `<p><a href="https://www.spotify.com/">Spotify</a></p>\n`
    ],
    [
        "[[Spotify->grotify]]\n::grotify:: https://www.spotify.com/",
        `<p><a href="https://www.spotify.com/">Spotify</a></p>\n`
    ],
    [
        "## Youhou\n[[Go to title->youhou]]",
        `<h2 id="youhou">Youhou</h2>\n<p><a href="#youhou">Go to title</a></p>\n`
    ],
    [
        "[[Ceci est un mauvais lien->",
        "",
        "Unclosed link in [[Ceci est un mauvais lien->",
    ],
    [
        "{{#idp}} blablah\n\n[[#idp]]",
        `<p id="idp"> blablah</p>\n<p><a href="#idp">#idp</a></p>\n`
    ],
    [
        "[[Escaped \\-> link->https://www.spotify.com/]]",
        `<p><a href="https://www.spotify.com/">Escaped &ShortRightArrow; link</a></p>\n`
    ],
    // Images
    [
        "((https://fr.wikipedia.org/wiki/%C3%89douard_Detaille#/media/Fichier:Carabinier_de_la_Garde_imp%C3%A9riale.jpg))",
        `<p><img src="https://fr.wikipedia.org/wiki/%C3%89douard_Detaille#/media/Fichier:Carabinier_de_la_Garde_imp%C3%A9riale.jpg"/></p>\n`
    ],
    [
        "!const DEFAULT_FIND_IMAGE=doyoureallybelieveafterlove\n((pipo.jpg))",
        '<p><img src="doyoureallybelieveafterlove/pipo.jpg"/></p>\n'
    ],
    // Constants
    ["!const NUMCONST = 25\n$$NUMCONST$$", "<p>25</p>\n"],
    ["\\!const NOT A CONST", "<p>!const NOT A CONST</p>\n"],
    [
        "!const ALPHACONST = abcd\n!const ALPHACONST = efgh",
        "",
        "Can't set the value of the already set constant : ALPHACONST of type string",
    ],
    [
        "$$VERSION$$",
        `<p>Hamill ${VERSION}</p>\n`
    ],
    // Variables
    ["!var NUMBER=5\n$$NUMBER$$", "<p>5</p>\n"],
    [
        "!var ALPHA=je suis un poulpe\n$$ALPHA$$",
        "<p>je suis un poulpe</p>\n",
    ],
    ["!var BOOLEAN=true\n$$BOOLEAN$$", "<p>true</p>\n"],
    [
        "!var NUM=1\n$$NUM$$\n!var NUM=25\n$$NUM$$\n",
        "<p>1</p>\n<p>25</p>\n",
    ],
    ["\\!var I AM NOT A VAR", "<p>!var I AM NOT A VAR</p>\n"],
    ["$$UNKNOWNVAR$$", "", "Unknown variable: UNKNOWNVAR"],
    [
        "!var TITLE=ERROR",
        "",
        "You are trying to declare a variable which use the name of the constant TITLE",
    ],
    [
        "!const TITLE = TRYING\n!const TITLE = TRYING TOO",
        "",
        "Can't set the value of the already set constant : TITLE of type string"
    ],
    // Inclusion of HTML files
    ["!include include_test.html", "<h1>Hello World!</h1>\n"],
    [
        "\\!include I AM NOT AN INCLUDE",
        "<p>!include I AM NOT AN INCLUDE</p>\n",
    ],
    // Links to CSS and JavaScript files
    ["!require pipo.css", ""],
    [
        "\\!require I AM NOT A REQUIRE",
        "<p>!require I AM NOT A REQUIRE</p>\n",
    ],
    // Raw HTML and CSS
    ["!html <div>Hello</div>", "<div>Hello</div>\n"],
    [
        "\\!html <div>Hello</div>",
        "<p>!html &lt;div&gt;Hello&lt;/div&gt;</p>\n",
    ], // Error, the \ should be removed!
    ["!css p { color: pink;}", ""],
    // New feature
    [
        "**started but not finished",
        "",
        "Unclosed bold text mode in **started but not finished."
    ],
    [
        "**started __first** closed wrong__",
        "",
        "Incoherent stacking of the modifier: finishing bold but underline should be closed first in **started __first** closed wrong__"
    ],
    // Défaut code
    [
        "!var DEFAULT_CODE=bnf\nYoupi j'aime bien les @@<règles>@@ !\n",
        `<p>Youpi j'aime bien les <code><span class="bnf-keyword" title="token n°0 : keyword">&lt;règles&gt;</span></code> !</p>\n`
    ],
    // More tests
    [
        "* @@*@@ pour une liste non numérotée",
        "<ul>\n  <li><code>*</code> pour une liste non numérotée</li>\n</ul>\n"
    ],
    // Défaut code class and id
    [
        "!var NEXT_CODE_CLASS=cls\n!var NEXT_CODE_ID=ids\n@@@\nhello\n@@@",
        '<pre id="ids" class="cls">\nhello\n</pre>\n'
    ]
];

function runAllTests(stop_on_first_error = false, stop_at = null) {
    console.log(
        "\n========================================================================"
    );
    console.log("Starting tests");
    console.log(
        "========================================================================"
    );
    let nb_ok = 0;
    for (let [index, t] of tests.entries()) {
        if (
            t === undefined ||
            t === null ||
            !Array.isArray(t) ||
            (t.length !== 2 && t.length !== 3)
        ) {
            throw new Error("Test not well defined:", t);
        }
        console.log(
            "\n-------------------------------------------------------------------------"
        );
        console.log(`Test ${index + 1}`);
        console.log(
            "-------------------------------------------------------------------------\n"
        );
        if (runTest(t[0], t[1], t.length === 3 ? t[2] : null)) {
            nb_ok += 1;
        } else if (stop_on_first_error) {
            throw new Error("Stopping on first error");
        }
        if (stop_at !== null && stop_at === index + 1) {
            console.log(`Stopped at ${stop_at}`);
            break;
        }
    }
    console.log(`\nTests ok : ${nb_ok} / ${tests.length}\n`);
}

function runTest(text, result, error = null) {
    try {
        let doc = Hamill.process(text);
        let output = doc.to_html();
        console.log("RESULT:");
        if (output === "") {
            console.log("EMPTY");
        } else {
            console.log(output);
        }
        if (output === result) {
            console.log("Test Validated");
            return true;
        } else {
            if (result === "") {
                result = "EMPTY";
            }
            console.log(`Error, expected:\n${result}`);
            return false;
        }
    } catch (e) {
        console.log("RESULT:");
        if (error !== null && e.message === error) {
            console.log("Error expected:", e.message);
            console.log("Test Validated");
            return true;
        } else if (error !== null) {
            console.log('-- Unexpected error:');
            console.log(e.message);
            console.log(e.stack);
            console.log(`-- Another error was expected:\n${error}`);
            return false;
        } else {
            console.log("Unexpected error:");
            console.log(e.message);
            console.log(e.stack);
            console.log(`-- No error expected, expected:\n${result}`);
            return false;
        }
    }
}

//-------------------------------------------------------------------------------
// Main
//-------------------------------------------------------------------------------

let do_test = false;
const DEBUG = true;

if (DEBUG) {
    console.log(`Running Hamill v${Hamill.version}`);
}
if (argv !== null) {
    let message = "---\n";
    message += "> Use hamill.mjs --process (or -p) <input config filepath> to convert the HML file to HTML\n";
    message += "  The file must be an object {} with a key named targets with an array value of pairs :\n";
    message += '            ["inputFile", "outputDir"]\n';
    message += `> Use hamill.mjs --tests (or -t) to launch all the tests (${tests.length}).\n`;
    message += `> Use hamill.mjs --eval (or -e) to run a read-eval-print-loop from hml to html\n`;
    message += "> Use hamill.mjs --help (or -h) to display this message";
    if (argv.length === 3) {
        if (argv[2] === '--tests' || argv[2] === '-t') {
            do_test = true;
        } else if (argv[2] === "--eval" || argv[2] === '-e') {
            console.log('---');
            console.log('Type exit to quit');
            let cmd = null;
            while (cmd !== "exit") {
                cmd = reader.question('> ');
                if (cmd !== "exit") {
                    let doc = Hamill.process(cmd);
                    console.log(doc.to_html(false))
                }
            }
        } else if (argv[2] === "--help" || argv[2] === "-h") {
            console.log(message);
        } else if (argv[2] === "--process" || argv[2] === "-p") {
            console.log('You need to provide a configuration file')
        } else {
            console.log(`Unrecognized option(s). Type --help for help.`);
        }
    } else if (argv.length === 4) {
        if (argv[2] === '--process' || argv[2] === '-p') {
            let filepath = argv[3];
            if (!fs.existsSync(filepath)) {
                throw new Error(`Impossible to find a valid hamill config file at ${filepath}`);
            }
            let workingDir = path.dirname(filepath);
            process.chdir(workingDir);
            console.log(`Set current working directory: ${process.cwd()}`);
            let raw = fs.readFileSync(filepath, "utf-8");
            let config = JSON.parse(raw);
            for (const target of config["targets"]) {
                if (target.hasOwnProperty("do") && target.hasOwnProperty("source") && target.hasOwnProperty("destination")) {
                    if (target["do"]) {
                        let inputFile = target["source"];
                        let targetOK = fs.existsSync(inputFile);
                        if (!targetOK) {
                            console.log(`${inputFile} is an invalid target. Aborting.`);
                            process.exit();
                        }
                        let outputDir = target["destination"];
                        Hamill.process(
                            inputFile
                        ).to_html_file(outputDir);
                    }
                } else if (target.hasOwnProperty("comment") && Object.keys(target).length === 1) {
                    // Do nothing, this is a comment
                } else {
                    console.log('Malformed configuration file. Aborting.');
                    process.exit();
                }
            }
        } else {
            console.log(`Unrecognized options. Type --help for help.`);
        }
    } else {
        console.log(message);
    }
}
if (fs !== null) {
    if (do_test) {
        runAllTests(true); //, 5);
    }
}

//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

export { Hamill, Document };
