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

let fs = null;
if (typeof process !== 'undefined' && process !== null && typeof process.version !== 'undefined' && process.version !== null && typeof process.version === "string") // ==="node"
{
    //import fs from 'fs';
    fs = await import('fs');
}

//-----------------------------------------------------------------------------
// Functions
//-----------------------------------------------------------------------------

function pp(o)
{
    o.document = 'redacted';
    return o;
}

//-----------------------------------------------------------------------------
// Classes
//-----------------------------------------------------------------------------

// Tagged lines

class Line
{
    constructor(value, type)
    {
        this.value = value;
        this.type = type;
    }

    toString()
    {
        return `${this.type} |${this.value}|`;
    }
}

// Document nodes

class EmptyNode
{
    constructor(document)
    {
        this.document = document;
        if (this.document === undefined || this.document === null)
        {
            throw new Error("Undefined or null document");
        }
    }
    toString()
    {
        return this.constructor.name;
    }
}

class Node extends EmptyNode
{
    constructor(document, content=null)
    {
        super(document);
        this.content = content;
    }

    toString()
    {
        if (this.content === null)
        {
            return this.constructor.name;
        } else {
            return this.constructor.name + " { content: " + this.content + " }";
        }
    }
}

class Text extends Node
{
    to_html()
    {
        return this.content;
    }
}

class Start extends Node
{
    to_html()
    {
        let markups = {
            'bold': 'b',
            'italic': 'i',
            'stroke': 's',
            'underline': 'u',
            'sup': 'sup',
            'sub': 'sub',
           // 'code': 'code'
        }
        return `<${markups[this.content]}>`;
    }
}

class Stop extends Node
{
    to_html()
    {
        let markups = {
            'bold': 'b',
            'italic': 'i',
            'stroke': 's',
            'underline': 'u',
            'sup': 'sup',
            'sub': 'sub',
           // 'code': 'code'
        }
        return  `</${markups[this.content]}>`;
    }
}

class Picture extends Node
{
    constructor(document, url, text=null, cls=null, ids=null)
    {
        super(document, url);
        this.text = text;
        this.cls = cls;
        this.ids = ids;
    }

    to_html()
    {
        let cls = '';
        if (this.cls !== null)
        {
            cls = ` class="${this.cls}"`;
        }
        let ids = '';
        if (this.ids !== null)
        {
            ids = ` id="${this.ids}"`;
        }
        if (this.text !== null)
        {
            return `<figure><img ${cls} ${ids} src="${this.content}" alt="${this.text}"></img><figcaption>${this.text}</figcaption></figure>`;
        }
        else
        {
            return `<img ${cls} ${ids} src="${this.content}"/>`;
        }
    }
}

class HR extends EmptyNode
{
    to_html()
    {
        return "<hr>\n";
    }
}

class BR extends EmptyNode
{
    to_html()
    {
        return '<br>';
    }
}

class Span extends EmptyNode
{
    constructor(document, ids, cls, text)
    {
        super(document);
        this.ids = ids;
        this.cls = cls;
        this.text = text;
    }

    to_html()
    {
        let r = "<span"
        if (this.ids !== null)
        {
            r += ` id="${this.ids}"`;
        }
        if (this.cls !== null)
        {
            r += ` class="${this.cls}"`;
        }
        r += `>${this.text}</span>`;
        return r;
    }
}

class ParagraphIndicator extends EmptyNode
{
    constructor(document, ids, cls)
    {
        super(document);
        this.ids = ids;
        this.cls = cls;
    }

    to_html()
    {
        let r = "<p"
        if (this.ids !== null)
        {
            r += ` id="${this.ids}"`;
        }
        if (this.cls !== null)
        {
            r += ` class="${this.cls}"`;
        }
        r += ">";
        return r;
    }
}

class Comment extends Node {}

class Row extends EmptyNode
{
    constructor(document, node_list_list)
    {
        super(document);
        this.node_list_list = node_list_list;
        this.is_header = false;
    }
}

class RawHTML extends Node
{
    to_html()
    {
        return this.content + "\n";
    }
}

class Include extends Node {}

class Title extends Node
{
    constructor(document, content, level)
    {
        super(document, content);
        this.level = level;
    }
}

class StartDiv extends EmptyNode
{
    constructor(document, id=null, cls=null)
    {
        super(document);
        this.id = id;
        this.cls = cls;
    }

    to_html()
    {
        if (this.id !== null && this.cls !== null)
        {
            return `<div id="${this.id}" class="${this.cls}">\n`;
        }
        else if (this.id !== null)
        {
            return `<div id="${this.id}">\n`;
        }
        else if (this.cls !== null)
        {
            return `<div class="${this.cls}">\n`;
        }
        else
        {
            return '<div>\n';
        }
    }
}

class EndDiv extends EmptyNode
{
    to_html()
    {
        return "</div>\n";
    }
}

class Composite extends EmptyNode
{
    constructor(document, parent=null)
    {
        super(document);
        this.children = [];
        this.parent = parent;
    }
    add_child(o)
    {
        if (! o instanceof EmptyNode)
        {
            throw new Error("A composite can only be made of EmptyNode and subclasses");
        }
        this.children.push(o);
        if (o instanceof Composite)
        {
            o.parent = this;
        }
        return o;
    }
    add_children(ls)
    {
        //this.children = this.children.concat(ls);
        for (let e of ls)
        {
            this.add_child(e);
        }
    }
    last()
    {
        return this.children[this.children.length-1];
    }
    parent()
    {
        return this.parent;
    }
    root()
    {
        if (this.parent === null)
        {
            return this;
        } else {
            return this.parent.root();
        }
    }
    toString()
    {
        return this.constructor.name + ` (${this.children.length})`;
    }
    pop()
    {
        return this.children.pop();
    }
    to_html(level=0)
    {
        let s = "";
        for (const child of this.children)
        {
            if (child instanceof List)
            {
                s += "\n" + child.to_html(level);
            } else {
                s += child.to_html();
            }
        }
        return s;
    }
}

class TextLine extends Composite
{
    constructor(document, children=[])
    {
        super(document);
        this.add_children(children);
    }
    to_html()
    {
        return this.document.string_to_html('', this.children);
    }
}

class List extends Composite
{
    constructor(document, parent, ordered=false, reverse=false, level=0, children=[])
    {
        super(document, parent);
        this.add_children(children);
        this.level = level;
        this.ordered = ordered;
        this.reverse = reverse;
    }

    to_html(level=0)
    {
        let start = "    ".repeat(level);
        let end = "    ".repeat(level);
        if (this.ordered)
        {
            start += "<ol>";
            end += "</ol>";
        } else {
            start += "<ul>";
            end += "</ul>";
        }
        let s = start + "\n";
        for (const child of this.children)
        {
            s +=  "    ".repeat(level) + "  <li>";
            if (child instanceof List)
            {
                s += "\n" + child.to_html(level+1) + "  </li>\n";
            } else if (child instanceof Composite && !(child instanceof TextLine)) {
                s += child.to_html(level+1) + "  </li>\n";
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
class Link extends EmptyNode
{
    constructor(document, url, display=null)
    {
        super(document);
        this.url = url;
        this.display = display; // list of nodes
    }
    toString()
    {
        return this.constructor.name + ` ${this.display} -> ${this.url}`;
    }
    to_html()
    {
        let url = this.url;
        let display = null;
        if (this.display !== null)
        {
            display = this.document.string_to_html('', this.display);
        }
        if (!url.startsWith('https://') && !url.startsWith('http://'))
        {
            if (url === '#')
            {
                url = this.document.get_label( this.document.make_anchor(display));
            }
            else
            {
                url = this.document.get_label(url);
            }
        }
        if (display === undefined || display === null)
        {
            display = url;
        }
        return `<a href="${url}">${display}</a>`;
    }
}
class Definition extends Node
{
    constructor(document, header, content)
    {
        super(document, content);
        this.header = header;
    }
}
class Quote extends Node {}
class Code extends Node
{
    constructor(document, content, inline=false)
    {
        super(document, content);
        this.inline = inline;
    }
    to_html()
    {
        // appelé uniquement par string_to_html pour le code inline
        //return '<code><span class="game-normal">' + this.content + '</span></code>';
        if (this.inline)
        {
            return '<code>' + this.content + '</code>';
        } else {
            throw new Error("It's done elsewhere.");
        }
    }
}

class GetVar extends Node
{
    constructor(document, content)
    {
        super(document, content);
        if (content === null || content === undefined)
        {
            throw new Error("A GetVar node must have a content");
        }
    }
}

class SetVar extends EmptyNode
{
    constructor(document, id, value, type, constant)
    {
        super(document);
        this.id = id;
        this.value = value;
        this.type = type;
        this.constant = constant;
    }
}
class Markup extends Node {}

// Variable & document

class Variable
{
    constructor(document, name, type, constant=false, value=null)
    {
        this.document = document;
        this.name = name;
        if (type !== 'number' && type !== 'string' && type !== 'boolean')
        {
            throw new Error(`Unknown type ${type} for variable ${name}`);
        }
        this.type = type;
        this.constant = constant;
        this.value = value;
    }

    set_variable(value)
    {
        if (this.value !== null && this.constant)
        {
            throw new Error(`Can't set the value of the already defined constant: ${this.name} of type ${this.type}`);
        }
        if ((isNaN(value) && this.type === 'number') ||
            (typeof value === 'string' && this.type !== 'string') ||
            (typeof value === 'boolean' && this.type !== 'boolean'))
        {
            throw new Error(`Cant't set the value to ${value} for variable ${this.name} of type ${this.type}`);
        }
        this.value = value;
    }

    get_value()
    {
        if (this.name === 'NOW')
        {
            return new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
        else
        return this.value;
    }
}

class Document
{
    constructor(name=null)
    {
        this.name = name;
        this.variables = {
            'VERSION': new Variable(this, 'VERSION', 'string', 'true', 'Hamill 2.00'),
            'NOW': new Variable(this, 'NOW', 'string', 'true', ''),
            'PARAGRAPH_DEFINITION': new Variable(this, 'PARAGRAPH_DEFINITION', 'boolean', false, false),
            'EXPORT_COMMENT': new Variable(this, 'EXPORT_COMMENT', 'boolean', false, false),
            'DEFAULT_CODE': new Variable(this, 'DEFAULT_CODE', 'string', 'false')
        };
        this.required = [];
        this.css = [];
        this.labels = {};
        this.nodes = [];
    }

    set_name(name)
    {
        this.name = name;
    }

    to_html_file(output_directory)
    {
        let parts = this.name.split('/');
        let outfilename = parts[parts.length - 1];
        outfilename = outfilename.substring(0, outfilename.lastIndexOf('.hml')) + '.html';
        let sep = output_directory[output_directory.length - 1] === '/' ? '' : '/';
        let target = output_directory + sep + outfilename;
        fs.writeFileSync(target, this.to_html(true)); // with header
        console.log('Outputting in:', target);
    }

    set_variable(k, v, t='string', c=false)
    {
        //console.log(`Setting ${k} to ${v}`);
        if (k in this.variables)
        {
            this.variables[k].set_variable(v);
        }
        else
        {
            this.variables[k] = new Variable(this, k, t, c, v);
        }
    }

    get_variable(k, default_value=null)
    {
        if (k in this.variables)
        {
            return this.variables[k].get_value();
        }
        else if (default_value !== null)
        {
            return default_value;
        }
        else
        {
            console.log('Dumping variables:');
            for (const [k, v] of Object.entries(this.variables))
            {
                console.log('   ', v.name, '=', v.value);
            }
            throw new Error(`Unknown variable: ${k}`);
        }
    }

    add_required(r)
    {
        this.required.push(r);
    }

    add_css(c)
    {
        this.css.push(c);
    }

    add_label(l, v)
    {
        this.labels[l] = v;
    }

    add_node(n)
    {
        if (n === undefined || n === null)
        {
            throw new Error("Trying to add an undefined or null node");
        }
        this.nodes.push(n);
    }

    get_node(i)
    {
        return this.nodes[i];
    }

    get_label(target)
    {
        if (! (target in this.labels))
        {
            for (const label in this.labels)
            {
                console.log(label);
            }
            throw new Error("Label not found : " + target);
        }
        return this.labels[target];
    }

    make_anchor(text)
    {
        return text.toLocaleLowerCase().replace(/ /g, '-');
    }

    string_to_html(content, nodes)
    {
        if (nodes === undefined || nodes === null)
        {
            throw new Error("No nodes to process");
        }
        if (typeof content !== 'string') throw new Error('Parameter content should be of type string');
        if (!Array.isArray(nodes) || (!(nodes[0] instanceof Start)
            && !(nodes[0] instanceof Stop) && !(nodes[0] instanceof Text)
            && !(nodes[0] instanceof Link) && !(nodes[0] instanceof GetVar))
            && !(nodes[0] instanceof ParagraphIndicator)
            && !(nodes[0] instanceof Picture)
            && !(nodes[0] instanceof Code)
            && (nodes[0] instanceof Code && !nodes[0].inline))
        {
            throw new Error(`Parameter nodes should be an array of Start|Stop|Text|Link|GetVar|Code(inline) and is: ${typeof nodes[0]}`);
        }
        for (let node of nodes)
        {
            if (node instanceof Start
                || node instanceof Stop
                || node instanceof Span
                || node instanceof Picture
                || node instanceof BR
                || node instanceof Text)
            {
                content += node.to_html();
            }
            else if (node instanceof Link)
            {
                content += node.to_html(this);
            }
            else if (node instanceof GetVar)
            {
                content += this.get_variable(node.content);
            }
            else if (node instanceof ParagraphIndicator)
            {
                let ret = content.lastIndexOf("<p>");
                content = content.substring(0, ret) + node.to_html() + content.substring(ret + 3);
            }
            else if (node instanceof Code)
            {
                content += node.to_html();
            }
            else
            {
                throw new Error("Impossible to handle this type of node: " + node.constructor.name);
            }
        }
        return content;
    }

    to_html(header=false)
    {
        let start_time = new Date();
        let content = '';
        if (header)
        {
            content = `<html lang="${this.get_variable('LANG', 'en')}">
<head>
  <meta charset=utf-8>
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${this.get_variable('TITLE', 'Undefined title')}</title>
  <link rel="icon" href="${this.get_variable('ICON', 'Undefined icon')}" type="image/x-icon" />
  <link rel="shortcut icon" href="https://xitog.github.io/dgx/img/favicon.ico" type="image/x-icon" />\n`;
            // For CSS
            if (this.required.length > 0)
            {
                for (let req of this.required)
                {
                    if (req.endsWith('.css'))
                    {
                        content += `  <link href="${req}" rel="stylesheet">\n`;
                    }
                }
            }
            if (this.css.length > 0)
            {
                content += '  <style type="text/css">\n';
                for (let cs of this.css)
                {
                    content += "    " + cs + "\n";
                }
                content += '  </style>\n';
            }
            // For javascript
            if (this.required.length > 0)
            {
                for (let req of this.required)
                {
                    if (req.endsWith('.js'))
                    {
                        content += `  <script src="${req}"></script>\n`;
                    }
                }
            }
            if (header)
            {
                content += "</head>\n";
                content += "<body>\n";
            }
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
        for (const [index, node] of this.nodes.entries())
        {
            //console.log(content.substring(content.indexOf('<body>')));
            //console.log(index, node);

            // Consistency
            if (!(node instanceof TextLine) && in_paragraph)
            {
                content += "</p>\n";
                in_paragraph = false;
            }
            if (!(node instanceof Definition) && in_def_list)
            {
                content += "</dl>\n";
                in_def_list = false;
            }
            if (!(node instanceof Row) && in_table)
            {
                content += "</table>\n";
                in_table = false;
            }
            if (!(node instanceof Quote) && in_quote_block)
            {
                content += "</blockquote>\n";
                in_quote_block = false;
            }
            if (!(node instanceof Code) && in_code_block)
            {
                content += "</pre>\n";
                in_code_block = false;
            }
            // Handling of nodes
            if (node.constructor.name === 'EmptyNode')
            {
                // Nothing, it is just too close the paragraph, done above.
            }
            else if (node instanceof Include)
            {
                let file = fs.readFileSync(node.content);
                content += file + "\n";
            }
            else if (node instanceof Title)
            {
                content += `<h${node.level} id="${this.make_anchor(node.content)}">${node.content}</h${node.level}>\n`;
            }
            else if (node instanceof Comment)
            {
                if (this.get_variable('EXPORT_COMMENT'))
                {
                    content += '<!--' + node.content + ' -->\n';
                }
            }
            else if (node instanceof SetVar)
            {
                this.set_variable(node.id, node.value, node.type, node.constant);
            }
            else if (node instanceof HR
                     || node instanceof StartDiv
                     || node instanceof EndDiv
                     || node instanceof RawHTML
                     || node instanceof List)
            {
                content += node.to_html();
            }
            else if (node instanceof TextLine)
            {
                if (!in_paragraph)
                {
                    in_paragraph = true;
                    content += "<p>";
                } else {
                    content += "<br>\n";
                }
                content += node.to_html();
            }
            else if (node instanceof Definition)
            {
                if (!in_def_list)
                {
                    in_def_list = true;
                    content += "<dl>\n";
                }
                content += '<dt>';
                content = this.string_to_html(content, node.header) + "</dt>\n";
                content += '<dd>'
                if (this.get_variable('PARAGRAPH_DEFINITION') === true) content += '<p>';
                content = this.string_to_html(content, node.content);
                if (this.get_variable('PARAGRAPH_DEFINITION') === true) content += '</p>';
                content += '</dd>\n';
            }
            else if (node instanceof Quote)
            {
                if (!in_quote_block)
                {
                    in_quote_block = true;
                    content += '<blockquote>\n';
                    if (node.content.startsWith('>>>'))
                    {
                        content += node.content.substring(3) + "<br>\n";
                    }
                    else
                    {
                        content += node.content.substring(2) + "<br>\n";
                    }
                }
                else
                {
                    if (node.content.startsWith('>>'))
                    {
                        content += node.content.substring(2) + "<br>\n";
                    }
                    else
                    {
                        content += node.content + "<br>\n";
                    }
                }
            }
            else if (node instanceof Code)
            {
                if (!in_code_block)
                {
                    in_code_block = true;
                    content += '<pre>\n';
                    if (node.content.startsWith('@@@'))
                    {
                        content += node.content.substring(3) + "\n";
                    }
                    else
                    {
                        content += node.content.substring(2) + "\n";
                    }
                }
                else
                {
                    if (node.content.startsWith('@@'))
                    {
                        content += node.content.substring(2) + "\n";
                    }
                    else
                    {
                        content += node.content + "\n";
                    }
                }
            }
            else if (node instanceof Row)
            {
                if (!in_table)
                {
                    in_table = true;
                    content += "<table>\n";
                }
                content += "<tr>";
                let delim = node.is_header ? 'th' : 'td';
                for (let node_list of node.node_list_list)
                {
                    let center = '';
                    //console.log(node_list[0]);
                    if (node_list.length > 0
                        && node_list[0] instanceof Node // for content
                        && node_list[0].content.length > 0
                        && node_list[0].content[0] === '=')
                    {
                        node_list[0].content = node_list[0].content.substring(1);
                        center = ' class="text-center"';
                    }
                    content += `<${delim}${center}>`;
                    content = this.string_to_html(content, node_list);
                    content += `</${delim}>`;
                }
                content += "</tr>\n";
            }
            else
            {
                //console.log(index, node);
                not_processed += 1;
                if (!(node.constructor.name in types_not_processed))
                {
                    types_not_processed[node.constructor.name] = 0;
                }
                types_not_processed[node.constructor.name] += 1;
            }
        }
        if (in_paragraph)
        {
            content += "</p>\n";
            in_paragraph = false;
        }
        if (stack.length > 0)
        {
            content = this.assure_list_consistency(content, stack, 0, null, null);
        }
        if (in_table)
        {
            content += "</table>\n";
        }
        if (in_quote_block)
        {
            content += "</blockquote>\n";
        }
        if (in_code_block)
        {
            content += "</pre>\n";
        }
        if (!first_text)
        {
            content += "</p>\n";
        }
        if (header)
        {
            content += "\n  </body>\n</html>";
        }
        console.log('\nNodes processed:', this.nodes.length - not_processed, '/', this.nodes.length);
        if (not_processed > 0)
        {
            console.log(`Nodes not processed ${not_processed}:`);
            for (let [k, v] of Object.entries(types_not_processed))
            {
                console.log('   -', k, v);
            }
        }
        let end_time = new Date();
        let elapsed = (end_time - start_time)/1000;
        console.log('Processed in:        %ds', elapsed, '\n');
        return content;
    }

    to_s(level=0, node=null)
    {
        let out = "";
        if (node === null || node === undefined)
        {
            out += '\n------------------------------------------------------------------------\n';
            out += 'Liste des nodes du document\n';
            out += '------------------------------------------------------------------------\n\n';
            for (const n of this.nodes)
            {
                out += this.to_s(level, n);
            }
        } else {
            let info = " " + node.toString();
            out += "    ".repeat(level) + info + '\n';
            if (node instanceof Composite)
            {
                for (const n of node.children)
                {
                    out += this.to_s(level + 1, n);
                }
            }
        }
        return out;
    }

}

class Hamill
{
     // Read a file and produce a big string
    static read_file(filename, encoding='utf8')
    {
        let data;
        try
        {
            data = fs.readFileSync(filename, encoding);
        }
        catch (err)
        {
                throw new Error(err);
        }
        return data;
    }

    static split_lines(data)
    {
        let lines = data.replace(/\r\n/g, "\n").replace(/\n\r/g, "\n").replace(/\r/g, "\n").split("\n");
        return lines;
    }

    // First pass: we tag all the lines
    static tag_lines(raw)
    {
        let lines = [];
        let next_is_def = false;
        let in_code_block = false;
        let in_quote_block = false;
        for (const [index, value] of raw.entries())
        {
            let trimmed = value.trim();
            if (in_code_block)
            {
                lines.push(new Line(value, 'code'))
            }
            else if (in_quote_block)
            {
                lines.push(new Line(value, 'quote'))
            }
            else if (trimmed.length === 0)
            {
                lines.push(new Line('', 'empty'));
            }
            // Titles :
            else if (trimmed[0] === '#')
            {
                lines.push(new Line(trimmed, 'title'));
            }
            // HR :
            else if ((trimmed.match(/-/g)||[]).length === trimmed.length)
            {
                lines.push(new Line('', 'separator'));
            }
            // Lists, line with the first non empty character is "* " or "+ " or "- " :
            else if (trimmed.substring(0, 2) === '* ')
            {
                lines.push(new Line(value, 'unordered_list'));
            }
            else if (trimmed.substring(0, 2) === '+ ')
            {
                lines.push(new Line(value, 'ordered_list'));
            }
            else if (trimmed.substring(0, 2) === '- ')
            {
                lines.push(new Line(value, 'reverse_list'));
            }
            // Keywords, line with the first non empty character is "!" :
            //     var, const, include, require, css, html, comment
            else if (trimmed.startsWith('!var '))
            {
                lines.push(new Line(trimmed, 'var'));
            }
            else if (trimmed.startsWith('!const '))
            {
                lines.push(new Line(trimmed, 'const'));
            }
            else if (trimmed.startsWith('!include '))
            {
                lines.push(new Line(trimmed, 'include'));
            }
            else if (trimmed.startsWith('!require '))
            {
                lines.push(new Line(trimmed, 'require'));
            }
            else if (trimmed.startsWith('!css '))
            {
                lines.push(new Line(trimmed, 'css'));
            }
            else if (trimmed.startsWith('!html'))
            {
                lines.push(new Line(trimmed, 'html'));
            }
            else if (trimmed.substring(0, 2) === '//')
            {
                lines.push(new Line(trimmed, 'comment'));
            }
            // Block of code
            else if (trimmed.substring(0, 2) === '@@@')
            {
                in_code_block = !in_code_block;
                lines.push(new Line(value, 'code'))
            }
            else if (trimmed.substring(0, 2) === '@@' && trimmed.substring(trimmed.length-2, trimmed.length) !== '@@') // :TODO: Escaping @@ in code for Ruby. @@code@@ should be a <p> not a <pre>!
            {
                lines.push(new Line(value, 'code'));
            }
            // Block of quote
            else if (trimmed.substring(0, 2) === '>>>')
            {
                in_quote_block = !in_quote_block;
                lines.push(new Line(value, 'quote'))
            }
            else if (trimmed.substring(0, 2) === '>>')
            {
                lines.push(new Line(value, 'quote'));
            }
            // Labels
            else if (trimmed.substring(0, 2) === '::')
            {
                lines.push(new Line(trimmed, 'label'));
            }
            // Div (Si la ligne entière est {{ }}, c'est une div. On ne fait pas de span d'une ligne)
            else if (trimmed.substring(0, 2) === '{{' && trimmed.substring(trimmed.length - 2) === '}}')
            {
                lines.push(new Line(trimmed, 'div'));
            }
            // Tables
            else if (trimmed[0] === '|' && trimmed[trimmed.length - 1] === '|')
            {
                lines.push(new Line(trimmed, 'row'));
            }
            // Definition lists
            else if (trimmed.substring(0, 2) === '$ ')
            {
                lines.push(new Line(trimmed.substring(2), 'definition-header'));
                next_is_def = true;
            }
            else
            {
                if (!next_is_def)
                {
                    lines.push(new Line(trimmed, 'text'));
                }
                else
                {
                    lines.push(new Line(trimmed, 'definition-content'));
                    next_is_def = false;
                }
            }
        }
        return lines;
    }

    static process_string(data)
    {
        let raw = Hamill.split_lines(data);
        let lines = Hamill.tag_lines(raw);
        if (DEBUG)
        {
            console.log('Lines:');
            for (const [index, line] of lines.entries())
            {
                console.log(`${index}: ${line}`);
            }
            console.log();
        }
        let doc = Hamill.process_lines(lines);
        return doc;
    }

    // Take a filename, return a list of tagged lines, output the result in a file
    static process_file(filename)
    {
        if (fs === null)
        {
            throw new Error("Not in node.js : module fs not defined. Aborting.");
        }
        if (DEBUG)
        {
            console.log('Processing file:', filename);
            console.log('--------------------------------------------------------------------------');
        }
        let data = Hamill.read_file(filename);
        let doc = this.process_string(data);
        doc.set_name(filename);
        return doc;
    }

    // Take a list of tagged lines return a valid Hamill document
    static process_lines(lines)
    {
        if (DEBUG) console.log(`Processing ${lines.length} lines`);
        let doc = new Document();
        let definition = null;
        // Lists
        let actual_list = null;
        let actual_level = 0;
        // Main loop
        for (const [index, line] of lines.entries())
        {
            let text = undefined;
            let id = undefined;
            let value = undefined;
            // List
            if (actual_list !== null && line.type !== 'unordered_list'
                                     && line.type !== 'ordered_list'
                                     && line.type !== 'reverse_list')
            {
                doc.add_node(actual_list.root());
                actual_list = null;
                actual_level = 0;
            }
            let elem_is_unordered = false;
            let elem_is_ordered = false;
            let elem_is_reverse = false;
            switch (line.type)
            {
                case 'title':
                    let lvl = 0;
                    for (const char of line.value)
                    {
                        if (char === '#')
                        {
                            lvl += 1;
                        }
                        else
                        {
                            break;
                        }
                    }
                    text = line.value.substring(lvl).trim();
                    doc.add_node(new Title(doc, text, lvl));
                    doc.add_label(doc.make_anchor(text), '#' + doc.make_anchor(text));
                    break;
                case 'separator':
                    doc.add_node(new HR(doc));
                    break;
                case 'text':
                    if (line.value.trim().startsWith('\\* ')) line.value = line.value.trim().substring(1);
                    let n = Hamill.process_inner_string(doc, line.value);
                    doc.add_node(new TextLine(doc, n));
                    break;
                case 'unordered_list':
                    elem_is_unordered = true;
                    if (actual_list === null)
                    {
                        actual_list = new List(doc, null, false, false);
                        actual_level = 1;
                    }
                    // next
                case 'ordered_list':
                    if (line.type === 'ordered_list') elem_is_ordered = true;
                    if (actual_list === null)
                    {
                        actual_list = new List(doc, null, true, false);
                        actual_level = 1;
                    }
                    // next
                case 'reverse_list':
                    if (line.type === 'reverse_list') elem_is_reverse = true;
                    if (actual_list === null)
                    {
                        actual_list = new List(doc, null, true, true);
                        actual_level = 1;
                    }
                    // common code
                    // compute item level
                    let delimiters = {'unordered_list': '* ', 'ordered_list': '+ ', 'reverse_list': '- '};
                    let delimiter = delimiters[line.type];
                    let list_level = Math.floor(line.value.indexOf(delimiter) / 2) + 1;
                    // coherency
                    if (list_level === actual_level)
                    {
                        if ((elem_is_unordered && (actual_list.ordered || actual_list.reverse))
                            || (elem_is_ordered && !actual_list.ordered)
                            || (elem_is_reverse && !actual_list.reverse))
                        {
                            throw new Error(`Incoherency with previous item ${actual_level} at this level ${list_level}: ul:${elem_is_unordered} ol:${elem_is_unordered} r:${elem_is_reverse} vs o:${actual_list.ordered} r:${actual_list.reverse}`);
                        }
                    }
                    while (list_level > actual_level)
                    {
                        let last = actual_list.pop(); // get and remove the last item
                        let c = new Composite(doc, actual_list); // create a new composite
                        c.add_child(last); // put the old last item in it
                        actual_list = actual_list.add_child(c); // link the new composite to the list
                        let sub = new List(doc, c, elem_is_ordered, elem_is_reverse); // create a new list
                        actual_list = actual_list.add_child(sub);
                        actual_level += 1;
                    }
                    while (list_level < actual_level)
                    {
                        actual_list = actual_list.parent();
                        actual_level -= 1;
                        if (! actual_list instanceof List)
                        {
                            throw new Error("List incoherency: last element is not a list.");
                        }
                    }
                    // creation
                    let item_text = line.value.substring(line.value.indexOf(delimiter) + 2).trim();
                    let item_nodes = Hamill.process_inner_string(doc, item_text);
                    actual_list.add_child(new TextLine(doc, item_nodes));
                    break;
                case 'html':
                    doc.add_node(new RawHTML(doc, line.value.replace('!html ', '').trim()));
                    break;
                case 'css':
                    text = line.value.replace('!css ', '').trim();
                    doc.add_css(text);
                    break;
                case 'include':
                    let include = line.value.replace('!include ', '').trim();
                    doc.add_node(new Include(doc, include));
                    break;
                case 'require':
                    text = line.value.replace('!require ', '').trim();
                    doc.add_required(text);
                    break;
                case 'const':
                    text = line.value.replace('!const ', '').split('=');
                    id = text[0].trim();
                    value = text[1].trim();
                    doc.set_variable(id, value, 'string', true);
                    break;
                case 'var':
                    text = line.value.replace('!var ', '').split('=');
                    id = text[0].trim();
                    value = text[1].trim();
                    if (value === 'true') value = true;
                    if (value === 'TRUE') value = true;
                    if (value === 'false') value = false;
                    if (value === 'FALSE') value = false;
                    let type = 'string';
                    if (typeof value === 'boolean')
                    {
                        type = 'boolean';
                    }
                    doc.add_node(new SetVar(doc, id, value, type, false));
                    break;
                case 'label':
                    value = line.value.replace(/::/, '').trim();
                    text = value.split('::');
                    let label = text[0].trim();
                    let url = text[1].trim();
                    doc.add_label(label, url);
                    break;
                case 'div':
                    value = line.value.substring(2, line.value.length - 2).trim();
                    let res = Hamill.process_inner_markup(value);
                    if (res['has_only_text'] && res['text'] === 'end')
                    {
                        doc.add_node(new EndDiv(doc));
                    }
                    else if (res['has_only_text'] && res['text'] === 'begin')
                    {
                        doc.add_node(new StartDiv(doc));
                    }
                    else if (res['has_only_text'])
                    {
                        console.log(res);
                        throw new Error(`Unknown quick markup: ${res['text']} in ${line}`);
                    }
                    else
                    {
                        doc.add_node(new StartDiv(doc, res['id'], res['class']));
                    }
                    break;
                case 'comment':
                    doc.add_node(new Comment(doc, line.value.substring(2)));
                    break;
                case 'row':
                    let content = line.value.substring(1, line.value.length - 1);
                    if (content.length === (content.match(/(-|\|)/g) || []).length)
                    {
                        let i = doc.nodes.length - 1;
                        while (doc.get_node(i) instanceof Row)
                        {
                            doc.get_node(i).is_header = true;
                            i -= 1;
                        }
                    }
                    else
                    {
                        let parts = content.split('|'); // Handle escape
                        let all_nodes = [];
                        for (let p of parts)
                        {
                            let nodes = Hamill.process_inner_string(doc, p);
                            all_nodes.push(nodes);
                        }
                        doc.add_node(new Row(doc, all_nodes));
                    }
                    break;
                case 'empty':
                    doc.add_node(new EmptyNode(doc));
                    break;
                case 'definition-header':
                    definition = Hamill.process_inner_string(doc, line.value);
                    break;
                case 'definition-content':
                    if (definition === null)
                    {
                        throw new Error('Definition content without header: ' + line.value);
                    }
                    doc.add_node(new Definition(doc, definition, Hamill.process_inner_string(doc, line.value)));
                    definition = null;
                    break;
                case 'quote':
                    doc.add_node(new Quote(doc, line.value));
                    break;
                case 'code':
                    doc.add_node(new Code(doc, line.value));
                    break;
                default:
                    throw new Error(`Unknown ${line.type}`);
            }
        }
        // List
        if (actual_list !== null)
        {
            doc.add_node(actual_list.root());
        }
        return doc;
    }

    static process_inner_string(doc, str)
    {
        let in_sup = false;
        let in_sub = false;
        let in_bold = false;
        let in_italic = false;
        let in_underline = false;
        let in_stroke = false;
        let in_link = false; // hum check this :TODO:
        let index = 0;
        let word = '';
        let nodes = [];
        while (index < str.length)
        {
            let char = str[index];
            let next = index + 1 < str.length ? str[index + 1] : null;
            let next_next = index + 2 < str.length ? str[index + 2] : null;
            let prev = index - 1 >= 0 ? str[index - 1] : null;
            // Glyphs
            // Glyphs - Solo
            if (char === '&')
            {
                word += '&amp;';
            } else if (char === '<')
            {
                word += '&lt;';
            } else if (char === '>')
            {
                word += '&gt;';
            // Glyphs - Quatuor
            } else if (char === '!' && next === '!' && next_next === ' ' && prev !== "  ") {
                if (word.length > 0)
                {
                    nodes.push(new Text(doc, word.substring(0, word.length - 1))); // remove the last space
                    word = '';
                }
                nodes.push(new BR(doc));
                index += 2;
            } else if (char === '\\' && str.substring(index + 1, index + 5) === ' !! ') { // escape it
                word += ' !! ';
                index += 4;
            // Glyphs - Trio
            } else if (char === '.' && next === '.' && next_next === '.' && prev !== "\\") {
                word += '…';
                index += 2;
            } else if (char === '=' && next === '=' && next_next === '>' && prev !== "\\") {
                word += '&DoubleRightArrow;'; // ==>
                index += 2;
            } else if (char === '<' && next === '=' && next_next === '=' && prev !== "\\") {
                word += '&DoubleLeftArrow;';  // <==
                index += 2;
            // Glyphs - Duo
            } else if (char === '-' && next === '>' && prev !== "\\" && !in_link) {
                word += '&ShortRightArrow;';  // ->
                index += 1;
            } else if (char === '<' && next === '-' && prev !== "\\") {
                word += '&ShortLeftArrow;';   // <-
                index += 1;
            } else if (char === 'o' && next === 'e' && prev !== "\\") {
                word += '&oelig;';            // oe
                index += 1;
            } else if (char === 'O' && next === 'E' && prev !== "\\") {
                word += '&OElig;';            // OE
                index += 1;
            } else if (char === '=' && next === '=' && prev !== "\\") {
                word += '&Equal;';            // ==
                index += 1;
            } else if (char === '!' && next === '=' && prev !== "\\") {
                word += '&NotEqual;';         // !=
                index += 1;
            } else if (char === '>' && next === '=' && prev !== "\\") {
                word += '&GreaterSlantEqual;';// >=
                index += 1;
            } else if (char === '<' && next === '=' && prev !== "\\") {
                word += '&LessSlantEqual;';   // <=
                index += 1;
            }
            // Styles
            else if (char === '@' && next === '@' && prev !== '\\')
            {
                if (word.length > 0)
                {
                    nodes.push(new Text(doc, word));
                    word = '';
                }
                let is_code_ok = -1;
                for (let subindex = index  + 2; subindex < str.length; subindex++)
                {
                    let subchar = str[subindex];
                    let subnext = (subindex + 1) < str.length ? str[subindex + 1] : null;
                    let subprev = (subindex - 1) > 0 ? str[subindex - 1] : null;
                    // Ignore all formatting in a inline code bloc
                    if (subchar === '@' && subnext === '@' && subprev !== '\\')
                    {
                        nodes.push(new Code(doc, str.substring(index + 2, subindex), true));
                        is_code_ok = subindex + 1;
                        break;
                    }
                }
                if (is_code_ok === -1)
                {
                    throw new Error("Unfinished inline code sequence: " + str);
                }
                index = is_code_ok; // will inc by 1 at the end of the loop
            }
            else if (char === '*' && next === '*' && prev !== '\\')
            {
                if (word.length > 0)
                {
                    nodes.push(new Text(doc, word));
                    word = '';
                }
                if (!in_bold)
                {
                    in_bold = true;
                    nodes.push(new Start(doc, 'bold'))
                }
                else
                {
                    in_bold = false;
                    nodes.push(new Stop(doc, 'bold'));
                }
                index += 1;
            }
            else if (char === "'" && next === "'" && prev !== '\\')
            {
                if (word.length > 0)
                {
                    nodes.push(new Text(doc, word));
                    word = '';
                }
                if (!in_italic)
                {
                    in_italic = true;
                    nodes.push(new Start(doc, 'italic'))
                }
                else
                {
                    in_italic = false;
                    nodes.push(new Stop(doc, 'italic'));
                }
                index += 1;
            }
            else if (char === '_' && next === '_' && prev !== '\\')
            {
                if (word.length > 0)
                {
                    nodes.push(new Text(doc, word));
                    word = '';
                }
                if (!in_underline)
                {
                    in_underline = true;
                    nodes.push(new Start(doc, 'underline'))
                }
                else
                {
                    in_underline = false;
                    nodes.push(new Stop(doc, 'underline'));
                }
                index += 1;
            }
            else if (char === '-' && next === '-' && prev !== '\\')
            {
                if (word.length > 0)
                {
                    nodes.push(new Text(doc, word));
                    word = '';
                }
                if (!in_stroke)
                {
                    in_stroke = true;
                    nodes.push(new Start(doc, 'stroke'))
                }
                else
                {
                    in_stroke = false;
                    nodes.push(new Stop(doc, 'stroke'));
                }
                index += 1;
            }
            else if (char === '^' && next === '^' && prev !== '\\')
            {
                if (word.length > 0)
                {
                    nodes.push(new Text(doc, word));
                    word = '';
                }
                if (!in_sup)
                {
                    in_sup = true;
                    nodes.push(new Start(doc, 'sup'));
                }
                else
                {
                    in_sup = false;
                    nodes.push(new Stop(doc, 'sup'));
                }
                index += 1;
            }
            else if (char === '%' && next === '%' && prev !== '\\')
            {
                if (word.length > 0)
                {
                    nodes.push(new Text(doc, word));
                    word = '';
                }
                if (!in_sub)
                {
                    in_sub = true;
                    nodes.push(new Start(doc, 'sub'));
                }
                else
                {
                    in_sub = false;
                    nodes.push(new Stop(doc, 'sub'));
                }
                index += 1;
            }
            else if (char === '{' && next === '{' && prev !== '\\')
            {
                if (word.length > 0)
                {
                    nodes.push(new Text(doc, word));
                    word = '';
                }
                let end = str.indexOf('}}', index);
                let content = str.substring(index+2, end);
                let res = Hamill.process_inner_markup(content);
                if (res['has_text'])
                {
                    nodes.push(new Span(doc, res['id'], res['class'], res['text']));
                }
                else
                {
                    nodes.push(new ParagraphIndicator(doc, res['id'], res['class']));
                }
                index = end + 1;
            }
            else if (char === '[' && next === '[' && prev !== '\\')
            {
                if (word.length > 0)
                {
                    nodes.push(new Text(doc, word));
                    word = '';
                }
                let end = str.indexOf(']]', index);
                let content = str.substring(index+2, end);
                let parts = content.split('->');
                let display = undefined;
                let url = undefined;
                if (parts.length === 1)
                {
                    url = parts[0].trim();
                }
                else if (parts.length === 2)
                {
                    display = Hamill.process_inner_string(doc, parts[0].trim());
                    url = parts[1].trim();
                }
                nodes.push(new Link(doc, url, display));
                index = end + 1;
            }
            else if (char === '(' && next === '(' && prev !== '\\')
            {
                if (word.length > 0)
                {
                    nodes.push(new Text(doc, word));
                    word = '';
                }
                let end = str.indexOf('))', index);
                let content = str.substring(index+2, end);
                let res = Hamill.process_inner_picture(content);
                nodes.push(new Picture(doc, res["url"], res["text"], res["class"], res["id"]));
                index = end + 1;
            }
            else if (char === '$' && next === '$' && prev !== '\\')
            {
                if (word.length > 0)
                {
                    nodes.push(new Text(doc, word));
                    word = '';
                }
                let end = str.indexOf('$$', index+2);
                let content = str.substring(index+2, end);
                nodes.push(new GetVar(doc, content));
                index = end + 1;
            }
            else if (char === '\\'
                     && ['*', "'", '-', '_', '^', '%', '@', '$', '(', '[', '{'].includes(next)
                     && ['*', "'", '-', '_', '^', '%', '@', '$', '(', '[', '{'].includes(next_next)
                     && next === next_next)
            {
                // Do nothing, this an escaping slash
            }
            else
            {
                word += char;
            }
            index += 1;
        }
        if (word.length > 0)
        {
            nodes.push(new Text(doc, word));
            word = '';
        }
        return nodes;
    }

    static process_inner_picture(content)
    {
        let res = null;
        let parts = content.split('->');
        if (parts.length === 1)
        {
            return {'has_text': false, 'has_only_text': false,
                    'class': null, 'id': null, 'text': null,
                    'url': parts[0]};
        }
        else
        {
            content = parts[0];
            res = Hamill.process_inner_markup(content);
            res['url'] = parts[1].trim();
        }
        return res;
    }

    static process_inner_markup(content)
    {
        let cls = null;
        let in_class = false;
        let ids = null;
        let in_ids = false;
        let text = null;
        let in_text = false;
        for (let c of content)
        {
            if (c === '.' && in_class === false && in_ids === false && in_text === false && cls === null && text === null)
            {
                in_class = true;
                cls = '';
                continue;
            }
            else if (c === '.')
            {
                throw new Error(`Class or text already defined for this markup: ${content}`);
            }

            if (c === '#' && in_class === false && in_ids === false && in_text === false && ids === null && text === null)
            {
                in_ids = true;
                ids = '';
                continue;
            }
            else if (c === '#')
            {
                throw new Error(`ID or text alreay defined for this markup: ${content}`);
            }

            if (c === ' ' && in_class)
            {
                in_class = false;
            }

            if (c === ' ' && in_ids)
            {
                in_ids = false;
            }

            if (c !== ' ' && in_class === false && in_ids === false && in_text === false && text === null)
            {
                in_text = true;
                text = '';
            }

            if (in_class)
            {
                cls += c;
            }
            else if (in_ids)
            {
                ids += c;
            }
            else if (in_text)
            {
                text += c;
            }
        }
        let has_text = (text !== null) ? true : false;
        let has_only_text = (has_text && cls === null && ids === null) ? true : false;
        return {'has_text': has_text, 'has_only_text': has_only_text,  'class': cls, 'id': ids, 'text': text};
    }

}

//-------------------------------------------------------------------------------
// Functions
//-------------------------------------------------------------------------------

function tests(stop_on_first_error=false)
{
    console.log("\n------------------------------------------------------------------------");
    console.log("Test de process_string");
    console.log("------------------------------------------------------------------------\n");
    let test_suite = [
        // Comments, HR and BR
        ["// This is a comment", ""],
        ["!var EXPORT_COMMENT=true\n// This is a comment", "<!-- This is a comment -->\n"],
        ["---", "<hr>\n"],
        ["a !! b", "<p>a<br>b</p>\n"],
        // Titles
        ["### Title 3", '<h3 id="title-3">Title 3</h3>\n'],
        ["#Title 1", '<h1 id="title-1">Title 1</h1>\n'],
        // Text modifications
        ["**bonjour**", "<p><b>bonjour</b></p>\n"],
        ["''italic''", "<p><i>italic</i></p>\n"],
        ["--strikethrough--", "<p><s>strikethrough</s></p>\n"],
        ["__underline__", "<p><u>underline</u></p>\n"],
        ["^^superscript^^", "<p><sup>superscript</sup></p>\n"],
        ["%%subscript%%", "<p><sub>subscript</sub></p>\n"],
        ["@@code@@", "<p><code>code</code></p>\n"],
    ];
    let nb_ok = 0;
    for (let t of test_suite)
    {
        if (test(t[0], t[1]))
        {
            nb_ok += 1;
        }
        else if (stop_on_first_error)
        {
            throw new Error("Stopping on first error");
        }
    }
    console.log(`Tests ok : ${nb_ok} / ${test_suite.length}`);

    //let doc = Hamill.process_string("* A\n* B [[http://www.gogol.com]]\n  + D\n  + E");
    //let doc = Hamill.process_string("+ Été @@2006@@ Mac, Intel, Mac OS X");
    //let doc = Hamill.process_string("@@Code@@");
    //let doc = Hamill.process_string("Bonjour $$VERSION$$");

    /*
    console.log("------------------------------------------------------------------------");
    console.log("Test de process_file (hamill)");
    console.log("------------------------------------------------------------------------\n");

    Hamill.process_file('../../dgx/static/input/informatique/tools_langs.hml').to_html_file('../../dgx/informatique/');
    Hamill.process_file('../../dgx/static/input/index.hml').to_html_file('../../dgx/');
    Hamill.process_file('../../dgx/static/input/tests.hml').to_html_file('../../dgx/');
    */
}

function test(s, r)
{
    let doc = Hamill.process_string(s);
    console.log(doc.to_s());
    let output = doc.to_html();
    console.log("RESULT:");
    if (output === "")
    {
        console.log("EMPTY");
    }
    else
    {
        console.log(output);
    }
    if (output === r)
    {
        console.log("Test Validated");
        return true;
    }
    else
    {
        if (r === "")
        {
            r = "EMPTY";
        }
        console.log("Error, expected:", r);
        return false;
    }
}

//-------------------------------------------------------------------------------
// Main
//-------------------------------------------------------------------------------

var DEBUG = false;
if (/*DEBUG &&*/ fs !== null)
{
    const do_test = true;
    //const do_test = false;
    if (do_test)
    {
        tests(true);
    }
    else
    {
        Hamill.process_file('../../dgx/static/input/index.hml').to_html_file('../../dgx/');
        Hamill.process_file('../../dgx/static/input/passetemps/pres_jeuxvideo.hml').to_html_file('../../dgx/passetemps/');
    }
}

export {Hamill, Document};