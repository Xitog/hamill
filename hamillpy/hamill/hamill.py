# -----------------------------------------------------------
# MIT Licence (Expat License Wording)
# -----------------------------------------------------------
# Copyright © 2020, Damien Gouteux
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
#
# For more information about my projects see:
# https://xitog.github.io/dgx (in French)

#------------------------------------------------------------------------------
# Imports
#------------------------------------------------------------------------------

from weyland import LANGUAGES, LEXERS
from datetime import datetime
from typing import List
import time
import traceback
import os.path
import json
import math
import sys
import os
import re

#------------------------------------------------------------------------------
# Constants
#------------------------------------------------------------------------------

VERSION = '2.0.5'
END_PARAGRAPH = "</p>\n"

#------------------------------------------------------------------------------
# Class
#------------------------------------------------------------------------------

class HamillException(Exception):
    pass

# Tagged lines

class Line:

    def __init__(self, value, type, param = None):
        self.value = value
        self.type = type
        self.param = param

    def __repr__(self):
        if self.param is None:
            return f"{self.type} |{self.value}|"
        else:
            return f"{self.type} |{self.value}| ({self.param})"

# Document nodes

class EmptyNode:

    def __init__(self, document, ids = None, cls = None):
        self.document = document
        if self.document is None:
            raise HamillException("Undefined or null document")
        self.ids = ids
        self.cls = cls
        if self.ids is not None:
            document.register_id(self.ids)

    def __repr__(self):
        return self.__class__.__name__

class Node(EmptyNode):

    def __init__(self, document, content = None, ids = None, cls = None):
        super().__init__(document, ids, cls)
        self.content = content

    def __repr__(self):
        if self.content is None:
            return self.__class__.__name__
        else:
            txt = ""
            if isinstance(self.content, list):
                txt = map(lambda x: str(x), self.content)
                txt = ", ".join(txt)
            else:
                txt = self.content
            return self.__class__.__name__ + " { content: " + txt + " }"

class Text(Node):
    def to_html(self):
        return self.document.safe(self.content)

class Start(Node):
    def to_html(self):
        markups = {
            "bold": "b",
            "italic": "i",
            "stroke": "s",
            "underline": "u",
            "sup": "sup",
            "sub": "sub",
            "strong": "strong",
            "em": "em",
            # 'code': 'code'
        }
        if self.content not in markups:
            raise HamillException(f"Unknown text style:{self.content}")
        return f"<{markups[self.content]}>"

class Stop(Node):
    def to_html(self):
        markups = {
            "bold": "b",
            "italic": "i",
            "stroke": "s",
            "underline": "u",
            "sup": "sup",
            "sub": "sub",
            "strong": "strong",
            "em": "em",
            # 'code': 'code'
        }
        if self.content not in markups:
            raise HamillException(f"Unknown text style:{self.content}")
        return f"</{markups[self.content]}>"

class Picture(Node):

    def __init__(self, document, url, text = None, cls = None, ids = None):
        super().__init__(document, url, ids, cls)
        self.text = text

    def to_html(self):
        cls = '' if self.cls is None else f' class="{self.cls}"'
        ids = '' if self.ids is None else f' id="{self.ids}"'
        path = self.document.get_variable("DEFAULT_FIND_IMAGE", "")
        target = self.content if path is None or path == "" else "/".join([path, self.content])
        if self.text is not None:
            return f'<figure><img{cls}{ids} src="{target}" alt="{self.text}"></img><figcaption>{self.text}</figcaption></figure>'
        else:
            return f'<img{cls}{ids} src="{target}"/>'

class HR(EmptyNode):

    def to_html(self):
        return "<hr>\n"

class BR(EmptyNode):

    def to_html(self):
        return "<br>"

class Span(Node):

    def to_html(self):
        cls = '' if self.cls is None else f' class="{self.cls}"'
        ids = '' if self.ids is None else f' id="{self.ids}"'
        return f'<span{ids}{cls}>{self.content}</span>'

class ParagraphIndicator(EmptyNode):

    def to_html(self):
        cls = '' if self.cls is None else f' class="{self.cls}"'
        ids = '' if self.ids is None else f' id="{self.ids}"'
        return f'<p{ids}{cls}>'

class Comment(Node):
    pass

class Row(EmptyNode):

    def __init__(self, document, node_list_list):
        super().__init__(document)
        self.node_list_list = node_list_list
        self.is_header = False

class RawHTML(Node):

    def to_html(self):
        return self.content + "\n"

class Include(Node):
    pass

class Title(Node):

    def __init__(self, document, content, level):
        super().__init__(document, content)
        self.level = level

class StartDetail(Node):

    def to_html(self):
        cls =  '' if self.cls is None else f' class="{self.cls}"'
        ids =  '' if self.ids is None else f' id="{self.ids}"'
        return f'<details{ids}{cls}><summary>{self.content}</summary>\n'

class Detail(Node):

    def __init__(self, document, content, data, ids = None, cls = None):
        super().__init__(document, content, ids, cls)
        self.data = data

    def to_html(self):
        cls = '' if self.cls is None else f' class="{self.cls}"'
        ids = '' if self.ids is None else f' id="{self.ids}"'
        return f'<details{ids}{cls}><summary>{self.content}</summary>{self.data}</details>\n'

class EndDetail(EmptyNode):

    def to_html(self):
        return "</details>\n"

class StartDiv(EmptyNode):

    def __init__(self, document, ids = None, cls = None):
        super().__init__(document, ids, cls)

    def to_html(self):
        cls = '' if self.cls is None else f' class="{self.cls}"'
        ids = '' if self.ids is None else f' id="{self.ids}"'
        return f'<div{ids}{cls}>\n'

class EndDiv(EmptyNode):

    def to_html(self):
        return "</div>\n"

class Composite(EmptyNode):

    def __init__(self, document, parent = None):
        super().__init__(document)
        self.children = []
        self.parent = parent

    def add_child(self, o):
        if not isinstance(o, EmptyNode):
            raise HamillException("A composite can only be made of EmptyNode and subclasses")
        self.children.append(o)
        if isinstance(o, Composite):
            o.parent = self
        return o

    def add_children(self, ls):
        for e in ls:
            self.add_child(e)

    def last(self):
        return self.children[-1]

    def get_parent(self):
        return self.parent

    def root(self):
        if self.parent is None:
            return self
        else:
            return self.parent.root()

    def __repr__(self):
        return self.__class__.__name__ + f' ({len(self.children)})'

    def pop(self):
        return self.children.pop()

    def to_html(self, level = 0):
        s = ""
        for child in self.children:
            if isinstance(child, ElementList):
                s += "\n" + child.to_html(level)
            else:
                s += child.to_html()
        return s

class TextLine(Composite):

    def __init__(self, document, children = None):
        children = [] if children is None else children
        super().__init__(document)
        self.add_children(children)

    def to_html(self, level=None):
        return self.document.string_to_html("", self.children)

class ElementList(Composite):

    def __init__(self, document, parent, ordered = False, reverse = False, level = 0, children = None):
        super().__init__(document, parent)
        children = [] if children is None else children
        self.add_children(children)
        self.level = level
        self.ordered = ordered
        self.reverse = reverse

    def to_html(self, level = 0):
        start = "    " * level
        end = "    " * level
        if self.ordered:
            if self.reverse:
                start += "<ol reversed>"
            else:
                start += "<ol>"
            end += "</ol>"
        else:
            start += "<ul>"
            end += "</ul>"
        s = start + "\n"
        for child in self.children:
            s += "    " * level + "  <li>"
            if isinstance(child, ElementList):
                s += "\n" + child.to_html(level + 1) + "  </li>\n"
            elif isinstance(child, Composite) and not isinstance(child, TextLine):
                s += child.to_html(level + 1) + "  </li>\n"
            else:
                s += child.to_html() + "</li>\n"
        s += end + "\n"
        return s

# [[label]] (you must define somewhere ::label:: https://) display = url
# [[https://...]] display = url
# [[display->label]] (you must define somewhere ::label:: https://)
# [[display->https://...]]
# [[display->#id]]
# [[display->#]] forge un id à partir du display
# http[s] can be omitted, but in this case the url should start by www.
class Link(EmptyNode):

    def __init__(self, document, url, display = None):
        super().__init__(document)
        self.url = url
        self.display = display # list of nodes

    def __repr__(self):
        return self.__class__.__name__ + f' {self.display} -> {self.url}'

    def to_html(self):
        url = self.url
        display = None
        if self.display is not None:
            display = self.document.string_to_html("", self.display)
        if not url.startswith("https://") and not url.startswith("http://") and not url.startswith("www."):
            if url == "#":
                url = self.document.get_label_value(self.document.make_anchor(display))
            elif url.startswith("#"):
                # it is an ID, check if it exists
                if not self.document.has_id(url[1:]):
                    raise HamillException(f"Refering to an unknown id {url[1:]}")
            else:
                url = self.document.get_label_value(url)
        if display is None:
            display = url
        return f'<a href="{url}">{display}</a>'

class Definition(Node):

    def __init__(self, document, header, content):
        super().__init__(document, content)
        self.header = header

class Quote(Node):

    def __init__(self, document, content, cls = None, ids = None):
        super().__init__(document, content)
        self.cls = cls
        self.ids = ids

    def __repr__(self):
        content = self.content.replace("\n", "\\n")
        return 'Quote { ' + f'content: {content}' + '}'

    def to_html(self):
        cls =  '' if self.cls is None else f' class="{self.cls}"'
        ids =  '' if self.ids is None else f' id="{self.ids}"'
        content = self.document.safe(self.content).replace("\n", "<br>\n")
        return f'<blockquote{ids}{cls}>\n' + content + "</blockquote>\n"

class Code(Node):

    def __init__(self, document, content, ids = None, cls = None, lang = None, inline = False):
        super().__init__(document, content, ids, cls)
        self.inline = inline
        self.lang = lang

    def __repr__(self):
        lang = self.document.get_variable("DEFAULT_CODE", "") if self.lang is None else self.lang
        lang = "" if lang is None or lang == "" else f':{lang}'
        inline =  " inline" if self.inline else ""
        return f'Code{lang} ' + '{' + f'content: {self.content}' + '}' + inline

    def to_html(self):
        output = self.content
        lang = self.document.get_variable("DEFAULT_CODE", "") if self.lang is None else self.lang
        if lang is not None and lang != "" and lang in LANGUAGES:
            output = LEXERS[lang].to_html(self.content, None, ["blank"])
        if self.inline:
            return "<code>" + output + "</code>"
        else:
            i = self.document.get_variable("NEXT_CODE_ID", "")
            ids = f' id="{i}"' if i is not None and i != "" else ""
            if i is not None:
                self.document.set_variable("NEXT_CODE_ID", None)
            c = self.document.get_variable("NEXT_CODE_CLASS", "")
            cs = f' class="{c}"' if c is not None and c != "" else ""
            if c is not None:
                self.document.set_variable("NEXT_CODE_CLASS", None)
            return f'<pre{ids}{cs}>\n' + output + "</pre>\n"

class GetVar(Node):

    def __init__(self, document, content):
        super().__init__(document, content)
        if content is None:
            raise HamillException("A GetVar node must have a content")

class SetVar(EmptyNode):

    def __init__(self, document, id, value, type, constant):
        super().__init__(document)
        self.id = id
        self.value = value
        self.type = type
        self.constant = constant

    def __repr__(self):
        return f'{self.id} = {self.value} ({self.type})'

# Variable & document

class Variable:

    def __init__(self, document, name, type, value = None):
        self.document = document
        self.name = name
        if type != "number" and type != "string" and type != "boolean":
            raise HamillException(f'Unknown type {type} for variable {name}')
        self.type = type
        self.value = value

    def set_value(self, value):
        if (isinstance(value, str) and not value.isnumeric() and self.type == "number") or \
            (isinstance(value, str) and self.type != "string") or \
            (isinstance(value, bool) and self.type != "boolean"):
            raise HamillException(f"Cant't set the value to {value} for variable {self.name} of type {self.type}")
        self.value = value

    def get_value(self):
        if self.name == "NOW":
            s = datetime.now().strftime("%A %d %B %Y").lower()
            if self.document.get_variable('LANG', None) == 'fr':
                s = s.replace('monday', 'lundi')
                s = s.replace('tuesday', 'mardi')
                s = s.replace('wednesday', 'mercredi')
                s = s.replace('thursday', 'jeudi')
                s = s.replace('friday', 'vendredi')
                s = s.replace('saturday', 'samedi')
                s = s.replace('sunday', 'dimanche')
                s = s.replace('january', 'janvier')
                s = s.replace('february', 'février')
                s = s.replace('march', 'mars')
                s = s.replace('april', 'avril')
                s = s.replace('may', 'mai')
                s = s.replace('june', 'juin')
                s = s.replace('july', 'juillet')
                s = s.replace('august', 'août')
                s = s.replace('september', 'septembre')
                s = s.replace('october', 'octobre')
                s = s.replace('november', 'novembre')
                s = s.replace('december', 'décembre')
            return s
        else:
            return self.value

class Constant(Variable):

    def __init__(self, document, name, type, value = None):
        super().__init__(document, name, type, value)

    def set_value(self, value):
        if self.value is None:
            super().set_value(value)
        else:
            raise HamillException(f"Can't set the value of the already set constant : {self.name} of type {self.type}")

class Document:

    def __init__(self, name = None):
        self.name = name
        self.ids = [] # list of all node ids
        variables = [
            Constant(self, "TITLE", "string"),
            Constant(self, "ICON", "string"),
            Constant(self, "LANG", "string"),
            Constant(self, "ENCODING", "string"),
            Constant(self, "VERSION", "string", f'Hamill {VERSION}'),
            Constant(self, "NOW", "string", ""),
            Variable(self, "PARAGRAPH_DEFINITION", "boolean", False),
            Variable(self, "EXPORT_COMMENT", "boolean", False),
            Variable(self, "DEFAULT_CODE", "string"),
            Constant(self, "BODY_CLASS", "string"),
            Constant(self, "BODY_ID", "string"),
            Variable(self, "NEXT_TABLE_CLASS", "string"),
            Variable(self, "NEXT_TABLE_ID", "string"),
            Variable(self, "DEFAULT_TABLE_CLASS", "string"),
            Variable(self, "DEFAULT_PARAGRAPH_CLASS", "string"),
            Variable(self, "DEFAULT_FIND_IMAGE", "string"),
            Variable(self, "NEXT_CODE_CLASS", "string"),
            Variable(self, "NEXT_CODE_ID", "string")
        ]
        self.variables = {}
        for v in variables:
            self.variables[v.name] = v
        self.required = []
        self.css = []
        self.labels = {}
        self.nodes = []

    def register_id(self, id):
        if id in self.ids:
            for i in self.ids:
                print(i)
            raise HamillException(f"You are trying to define two elements with same id: {id}")
        else:
            self.ids.append(id)

    def has_id(self, id):
        return id in self.ids

    def set_name(self, name):
        self.name = name

    def to_html_file(self, output_directory = ""):
        output_directory = output_directory.replace("/", os.path.sep)
        if output_directory[-1] != os.path.sep:
            output_directory += os.path.sep
        parts = self.name.split("/")
        outfilename = parts[-1]
        outfilename = outfilename[0 : outfilename.rfind(".hml")] + ".html"
        target = ""
        if os.path.isdir(output_directory):
            target = output_directory + outfilename
        else:
            target = outfilename
        f = open(target, 'w', encoding='utf-8', newline='\n')
        f.write(self.to_html(True)) # With header
        f.close()
        print("Outputting in:", target)

    def has_variable(self, k):
        return k in self.variables and self.variables[k] is not None

    def set_variable(self, k, v, t = "string", c = False):
        if k in self.variables:
            # we have !var toto and in memory Constant("toto")
            if isinstance(self.variables[k], Constant) and not c:
                raise HamillException(f"You are trying to declare a variable which use the name of the constant {k}")
            self.variables[k].set_value(v)
        elif c:
            self.variables[k] = Constant(self, k, t, v)
        else:
            self.variables[k] = Variable(self, k, t, v)

    def get_variable(self, k, default_value = None):
        if k in self.variables and self.variables[k].get_value() is not None:
            return self.variables[k].get_value()
        elif default_value is not None:
            return default_value
        else:
            print("Dumping variables:")
            for v in self.variables.values():
                print("   ", v.name, "=", v.value)
            raise HamillException(f'Unknown variable: {k}')

    def add_required(self, r):
        self.required.append(r)

    def add_css(self, c):
        self.css.append(c)

    def add_label(self, l, v):
        self.labels[l] = v

    def add_node(self, n):
        if n is None:
            raise HamillException("Trying to add a null node")
        self.nodes.append(n)

    def get_node(self, i):
        return self.nodes[i]

    def get_label_value(self, target):
        if target not in self.labels:
            for label in self.labels:
                print(label)
            raise HamillException("Label not found : |" + target + "|")
        return self.labels[target]

    def make_anchor(self, text):
        step1 = text.replace(" ", "-").lower()
        result = ""
        in_html = False
        for c in step1:
            if c == "<":
                in_html = True
            elif c == ">":
                in_html = False
            elif not in_html:
                result += c
        return result

    def string_to_html(self, content, nodes):
        if nodes is None:
            raise HamillException("No nodes to process")
        if not isinstance(content, str):
            raise HamillException("Parameter content should be of type string")
        if not isinstance(nodes, list):
            raise HamillException("Parameter nodes should be an array")
        # Parameter nodes should be an array of Start|Stop|Text|BR|Picture|ParagraphIndicator|Span|Link|GetVar|Code(inline)
        for node in nodes:
            if isinstance(node, Start) or \
                isinstance(node, Stop) or \
                isinstance(node, Span) or \
                isinstance(node, Picture) or \
                isinstance(node, BR) or \
                isinstance(node, Text) or \
                (isinstance(node, Code) and node.inline) or \
                isinstance(node, ParagraphIndicator):
                content += node.to_html()
            elif isinstance(node, Link):
                content += node.to_html()
            elif isinstance(node, GetVar):
                v = self.get_variable(node.content)
                s = str(v)
                if type(v) == bool:
                    s = "true" if v else "false"
                content += s
            else:
                raise HamillException("Impossible to handle this type of node: " + node.__class__.__name__)
        return content

    def safe(self, s):
        index = 0
        word = ''
        specials = ["@", "(", "[", "{", "$", "*", "!", "'", "/", "_", "^", "%", "-", "#", "\\", "•"]
        while index < len(s):
            char = s[index]
            nextc = s[index + 1] if index + 1 < len(s) else None
            next_next = s[index + 2] if index + 2 < len(s) else None
            prev = s[index - 1] if index - 1 >= 0 else None
            # Glyphs - Trio
            if char == "." and nextc == "." and next_next == "." and prev != "\\":
                word += "…"
                index += 2
            elif char == "=" and nextc == "=" and next_next == ">" and prev != "\\":
                word += "&DoubleRightArrow;"; # ==>
                index += 2
            elif char == "<" and nextc == "=" and next_next == "=" and prev != "\\":
                word += "&DoubleLeftArrow;" # <==
                index += 2
                # Glyphs - Duo
            elif char == "-" and nextc == ">" and prev != "\\":
                word += "&ShortRightArrow;" # ->
                index += 1
            elif char == "<" and nextc == "-" and prev != "\\":
                word += "&ShortLeftArrow;" # <-
                index += 1
            elif char == "o" and nextc == "e" and prev != "\\":
                word += "&oelig;" # oe
                index += 1
            elif char == "O" and nextc == "E" and prev != "\\":
                word += "&OElig;" # OE
                index += 1
            elif char == "=" and nextc == "=" and prev != "\\":
                word += "&Equal;" # ==
                index += 1
            elif char == "!" and nextc == "=" and prev != "\\":
                word += "&NotEqual;" # !=
                index += 1
            elif char == ">" and nextc == "=" and prev != "\\":
                word += "&GreaterSlantEqual;" # >=
                index += 1
            elif char == "<" and nextc == "=" and prev != "\\":
                word += "&LessSlantEqual;" # <=
                index += 1
                # Glyph - solo
            elif char == '&':
                word += '&amp;'
            elif char == '<':
                word += '&lt;'
            elif char == '>':
                word += '&gt;'
            # Escaping
            elif char == "\\" and nextc in specials:
                # Do nothing, this is an escaping slash
                if nextc == "\\":
                    word += "\\"
                    index += 1
            else:
                word += char
            index += 1
        return word

    def to_html(self, header = False, skip_error = False):
        start_time = time.time()
        content = ""
        if header:
            content = f'<!DOCTYPE HTML>\n<html lang="{self.get_variable("LANG", "en")}">\n\
<head>\n\
  <meta charset="{self.get_variable("ENCODING", "utf-8")}">\n\
  <meta http-equiv="X-UA-Compatible" content="IE=edge">\n\
  <meta name="viewport" content="width=device-width, initial-scale=1">\n\
  <title>' + self.get_variable("TITLE", "Undefined title") + '</title>\n\
  <link rel="icon" href="' + self.get_variable("ICON", "Undefined icon") + '" type="image/x-icon" />\n\
  <link rel="shortcut icon" href="https://xitog.github.io/dgx/img/favicon.ico" type="image/x-icon" />\n'
            # For CSS
            if len(self.required) > 0:
                for req in self.required:
                    if req.endswith(".css"):
                        content += f'  <link href="{req}" rel="stylesheet">\n'
            if len(self.css) > 0:
                content += '  <style type="text/css">\n'
                for cs in self.css:
                    content += "    " + cs + "\n"
                content += "  </style>\n"
            # For javascript
            if len(self.required) > 0:
                for req in self.required:
                    if req.endswith(".js"):
                        content += f'  <script src="{req}"></script>\n'
                    elif req.endswith(".mjs"):
                        content += f'  <script type="module" src="{req}"></script>\n'
            content += "</head>\n"
            bid = self.get_variable("BODY_ID", "")
            sbid = f' id="{bid}"' if bid is not None and bid != "" else ''
            bclass = self.get_variable("BODY_CLASS", "")
            sbclass = f' class="{bclass}"' if bclass is not None and bclass != "" else ''
            content += f'<body{sbid}{sbclass}>\n'
        first_text = True
        not_processed = 0
        types_not_processed = []
        # Table
        in_table = False
        # List
        stack = []
        # Paragraph
        in_paragraph = False
        in_def_list = False
        for node in self.nodes:

            # Consistency
            if not isinstance(node, TextLine) and in_paragraph:
                content += END_PARAGRAPH
                in_paragraph = False
            if not isinstance(node, Definition) and in_def_list:
                content += "</dl>\n"
                in_def_list = False
            if not isinstance(node, Row) and in_table:
                content += "</table>\n"
                in_table = False

            # Handling of nodes
            if isinstance(node, Include):
                file = open(node.content, 'r', encoding='utf-8')
                content += file.read() + "\n"
                file.close()
            elif isinstance(node, Title):
                content_as_string = self.string_to_html("", node.content)
                content += f'<h{node.level} id="{self.make_anchor(content_as_string)}">{content_as_string}</h{node.level}>\n'
            elif isinstance(node, Comment):
                if self.get_variable("EXPORT_COMMENT"):
                    content += "<!--" + node.content + " -->\n"
            elif isinstance(node, SetVar):
                self.set_variable(node.id, node.value, node.type, node.constant)
            elif isinstance(node, HR) or isinstance(node, StartDiv) or isinstance(node, EndDiv) or isinstance(node, StartDetail) or isinstance(node, EndDetail) or isinstance(node, Detail) or isinstance(node, RawHTML) or isinstance(node, ElementList) or isinstance(node, Quote) or isinstance(node, Code):
                content += node.to_html()
            elif isinstance(node, TextLine):
                # Check that ParagraphIndicator must be only at 0
                for nc in range(0, len(node.children)):
                    if isinstance(node.children[nc], ParagraphIndicator) and nc > 0:
                        raise HamillException("A paragraph indicator must always be at the start of a text line")
                if not in_paragraph:
                    in_paragraph = True
                    # If the first child is a pragraph indicator, don't start the paragraph !
                    if len(node.children) > 0 and not isinstance(node.children[0], ParagraphIndicator):
                        c = self.get_variable("DEFAULT_PARAGRAPH_CLASS", "")
                        cs = f' class="{c}"' if c is not None and c != "" else ""
                        content += f"<p{cs}>"
                else:
                    content += "<br>\n"; # Chaque ligne donnera une ligne avec un retour à la ligne
                content += node.to_html()
            elif isinstance(node, Definition):
                if not in_def_list:
                    in_def_list = True
                    content += "<dl>\n"
                content += "<dt>"
                content = self.string_to_html(content, node.header) + "</dt>\n"
                content += "<dd>"
                if self.get_variable("PARAGRAPH_DEFINITION"):
                    content += "<p>"
                content = self.string_to_html(content, node.content)
                if self.get_variable("PARAGRAPH_DEFINITION"):
                    content += "</p>" # we do not use END_PARAGRAPH here because we don't want the \n
                content += "</dd>\n"
            elif isinstance(node, Row):
                if not in_table:
                    in_table = True
                    # Try to get a class. NEXT > DEFAULT
                    c = self.get_variable("NEXT_TABLE_CLASS", "")
                    if c is None or c == "":
                        c = self.get_variable("DEFAULT_TABLE_CLASS", "")
                    else:
                        self.set_variable("NEXT_TABLE_CLASS", None) # reset if found
                    cs = f' class="{c}"' if c is not None and c != "" else ""
                    # Try to get an id
                    i1 = self.get_variable("NEXT_TABLE_ID", "")
                    if i1 is not None:
                        self.set_variable("NEXT_TABLE_ID", None) # reset if found
                    i1s = f' id="{i1}"' if i1 is not None and i1 != "" else ""
                    content += f'<table{i1s}{cs}>\n'
                content += "<tr>"
                delim = "th" if node.is_header else "td"
                for node_list in node.node_list_list:
                    center = ""
                    span = ""
                    if len(node_list) > 0 and isinstance(node_list[0], Node) and len(node_list[0].content) > 0 and node_list[0].content[0] == "=":
                        node_list[0].content = node_list[0].content[1:]
                        center = ' style="text-align: center"'
                    elif len(node_list) > 0 and isinstance(node_list[0], Node) and len(node_list[0].content) > 0 and node_list[0].content[0] == ">":
                        node_list[0].content = node_list[0].content[1:]
                        center = ' style="text-align: right"'
                    if len(node_list) > 0 and isinstance(node_list[0], Node) and len(node_list[0].content) > 2 and node_list[0].content[0] == "#":
                        if node_list[0].content[1] == 'c':
                            span = ' colspan="'
                        elif node_list[0].content[1] == 'r':
                            span = ' rowspan="'
                        if span != '':
                            i = 2
                            found  = False
                            while i < len(node_list[0].content):
                                if node_list[0].content[i] == '#':
                                    found = True
                                    break
                                i += 1
                            if not found:
                                span = ''
                            else:
                                span += node_list[0].content[2 : i] + '"'
                                node_list[0].content = node_list[0].content[i+1:]
                    content += f'<{delim}{center}{span}>'
                    content = self.string_to_html(content, node_list)
                    content += f'</{delim}>'
                content += "</tr>\n"
            elif skip_error:
                not_processed += 1
                if node.__class__.__name__ not in types_not_processed:
                    types_not_processed[node.__class__.__name__] = 0
                types_not_processed[node.__class__.__name__] += 1
            elif isinstance(node, EmptyNode):
                # Nothing, it is just too close the paragraph, done above.
                pass
            else:
                raise HamillException(f'Unknown node: {node.__class__.__name__}')
        if in_paragraph:
            content += END_PARAGRAPH
        if len(stack) > 0:
            content = self.assure_list_consistency(content, stack, 0, None, None)
        if in_table:
            content += "</table>\n"
        if in_def_list:
            content += "</dl>\n"
        if not first_text:
            content += END_PARAGRAPH
        if header:
            content += "\n  </body>\n</html>"
        print("\nRoot nodes processed:", len(self.nodes) - not_processed, "/", len(self.nodes))
        if not_processed > 0:
            print(f'Nodes not processed {not_processed}:')
            for k, v in types_not_processed.items():
                print("   -", k, v)
        end_time = time.time()
        elapsed = (end_time - start_time)
        print(f"Processed in:        {round(elapsed, 5)}s\n")
        return content

    def to_s(self, level = 0, node = None, header = False):
        out = ""
        if node is None:
            if header:
                out += "\n------------------------------------------------------------------------\n"
                out += "Liste des nodes du document\n"
                out += "------------------------------------------------------------------------\n\n"
            for n in self.nodes:
                out += self.to_s(level, n)
        else:
            info = "    " + str(node)
            out += "    " * level + info + "\n"
            if isinstance(node, Composite):
                for n in node.children:
                    out += self.to_s(level + 1, n)
            if isinstance(node, Row):
                for n in node.node_list_list:
                    out += self.to_s(level + 1, n)
        return out

class Hamill:

    VERSION = VERSION

    @staticmethod
    def process(string_or_filename):
        # Try to read as a file name, if it fails, take it as a string
        data = None
        name = None
        if (os.path.isfile(string_or_filename)):
            f = open(string_or_filename, 'r', encoding='utf-8')
            data = f.read()
            f.close()
            print(f"Data read from file: {string_or_filename}")
            name = string_or_filename
        if data is None:
            data = string_or_filename
            print('Raw string:')
            print(data.replace("\n", '\\n') + "\n")
            print("Data read from string:")
        data = data.replace("\r\n", "\n")
        data = data.replace("\r", "\n")
        # Display raw lines
        lines = data.split("\n")
        for index, line in enumerate(lines):
            nline = line.replace("\n", "<NL>")
            print(f"    {index + 1}. {nline}")
        # Tag lines
        tagged = Hamill.tag_lines(data.split("\n"))
        print("\nTagged Lines:")
        for index, line in enumerate(tagged):
            print(f"    {index + 1}. {line}")
        # Make a document
        doc = Hamill.parse_tagged_lines(tagged)
        doc.set_name(name)
        print("\nDocument:")
        print(doc.to_s())
        return doc

    # First pass: we tag all the lines
    @staticmethod
    def tag_lines(raw):
        msg = "Level list must be indented by a multiple of two"
        lines = []
        next_is_def = False
        in_code_block = False # only the first and the last line start with @@@
        in_code_block_prefixed = False # each line must start with @@
        in_quote_block = False # only the first and the last line start with >>>
        for value in raw:
            trimmed = value.strip()
            # Check states
            # End of prefixed block
            if in_code_block_prefixed and not trimmed.startswith('@@') and not trimmed.startswith('@@@'):
                in_code_block_prefixed = False
                # Final line @@@ of a not prefixed block
            elif in_code_block and trimmed == '@@@':
                in_code_block = False
                continue
            elif in_quote_block and trimmed == '>>>':
                in_quote_block = False
                continue

            # States handling
            if in_code_block or in_code_block_prefixed:
                lines.append(Line(value, "code"))
            elif in_quote_block:
                lines.append(Line(value, "quote"))
            elif len(trimmed) == 0:
                lines.append(Line("", "empty"))
                # Titles :
            elif trimmed[0] == "#":
                lines.append(Line(trimmed, "title"))
            # HR :
            elif len(re.findall("-", trimmed) or []) == len(trimmed):
                lines.append(Line("", "separator"))
            # Lists, line with the first non empty character is "* " or "+ " or "- " :
            elif trimmed[0:2] == "* ":
                start = value.find("* ")
                level = math.trunc(start / 2)
                if level * 2 != start:
                    raise HamillException(msg)
                lines.append(Line(value, "unordered_list", level + 1))
            elif trimmed[0:2] == "+ ":
                start = value.index("+ ")
                level = math.trunc(start / 2)
                if level * 2 != start:
                    raise HamillException(msg)
                lines.append(Line(value, "ordered_list", level + 1))
            elif trimmed[0:2] == "- ":
                start = value.index("- ")
                level = math.trunc(start / 2)
                if level * 2 != start:
                    raise HamillException(msg)
                lines.append(Line(value, "reverse_list", level + 1))
            # Keywords, line with the first non empty character is "!" :
            # var, const, include, require, css, html, comment
            elif trimmed.startswith("!var "):
                lines.append(Line(trimmed, "var"))
            elif trimmed.startswith("!const "):
                lines.append(Line(trimmed, "const"))
            elif trimmed.startswith("!include "):
                lines.append(Line(trimmed, "include"))
            elif trimmed.startswith("!require "):
                lines.append(Line(trimmed, "require"))
            elif trimmed.startswith("!css "):
                lines.append(Line(value, "css"))
            elif trimmed.startswith("!html"):
                lines.append(Line(value, "html"))
            elif trimmed.startswith("!rem") or trimmed[0:2] == "§§":
                lines.append(Line(trimmed, "comment"))
            # Block of code
            elif trimmed[0:3] == "@@@":
                in_code_block = True
                lines.append(Line(value, "code"))
            elif trimmed[0:2] == "@@" and "@@" not in trimmed[2:]:
                in_code_block_prefixed = True
                lines.append(Line(value, "code"))
            # Block of quote
            elif trimmed[0:3] == ">>>":
                in_quote_block = True # will be desactivate in Check states
                lines.append(Line(value, "quote"))
            elif trimmed[0:2] == ">>":
                lines.append(Line(value, "quote"))
            # Labels
            elif trimmed[0:2] == "::":
                lines.append(Line(trimmed, "label"))
                # Div (Si la ligne entière est {{ }}, c'est une div. On ne fait pas de span d'une ligne)
            elif trimmed[0:2] == "{{" and trimmed.endswith("}}") and trimmed.rfind("{{") == 0:
                # span au début et à la fin = erreur
                lines.append(Line(trimmed, "div"))
                # Detail
            elif trimmed[0:2] == "<<" and trimmed.endswith(">>") and trimmed.rfind("<<") == 0:
                lines.append(Line(trimmed, "detail"))
                # Tables
            elif trimmed[0] == "|" and trimmed[-1] == "|":
                lines.append(Line(trimmed, "row"))
                # Definition lists
            elif trimmed[0:2] == "$ ":
                lines.append(Line(trimmed[2:], "definition-header"))
                next_is_def = True
            elif not next_is_def:
                lines.append(Line(trimmed, "text"))
            else:
                lines.append(Line(trimmed, "definition-content"))
                next_is_def = False
        return lines

    @staticmethod
    def escaped_split(sep, s):
        parts = []
        part = ""
        index = 0
        while index < len(s):
            char = s[index]
            try_sep = s[index : index + len(sep)]
            nextc = s[index + 1 : index + 1 + len(sep)] if (index + 1) < len(s) else ""
            if try_sep == sep:
                parts.append(part)
                part = ""
                index += len(sep) - 1
            elif char == "\\" and nextc == sep:
                part += sep
                index += len(sep)
            else:
                part += char
            index += 1
        if len(part) > 0:
            parts.append(part)
        return parts

    # Take a list of tagged lines return a valid Hamill document
    @staticmethod
    def parse_tagged_lines(lines):
        if (DEBUG): print(f'\nProcessing {len(lines)} lines')
        doc = Document()
        definition = None
        # Lists
        actual_list = None
        actual_level = 0
        starting_level = 0
        # On pourrait avoir un root aussi
        delimiters = {
            "unordered_list": "* ",
            "ordered_list": "+ ",
            "reverse_list": "- ",
        }
        # Main loop
        count = 0
        while count < len(lines):
            #print("DEBUG:", count + 1, "/", len(lines), lines[count], actual_list)
            line = lines[count]
            text = None
            ids = None
            value = None
            # List
            if actual_list is not None and line.type != "unordered_list" and line.type != "ordered_list" and line.type != "reverse_list":
                doc.add_node(actual_list.root())
                actual_list = None
                actual_level = 0
            # Titles
            lvl = 0
            # Quotes
            node_content = ""
            free = False
            # Lists
            delimiter = ""
            list_level = 0
            elem_is_unordered = False
            elem_is_ordered = False
            elem_is_reverse = False
            item_text = ""
            item_nodes = []
            # Includes
            include = ""
            # Rows
            content = ""
            # Divs
            res = None
            if line.type == "title":
                for char in line.value:
                    if char == "#":
                        lvl += 1
                    else:
                        break
                text = line.value[lvl:].strip()
                try:
                    interpreted = Hamill.parse_inner_string(doc, text)
                    doc.add_node(Title(doc, interpreted, lvl))
                    doc.add_label(doc.make_anchor(text), "#" + doc.make_anchor(text))
                except Exception as e:
                    print(f"Error at line {count} on title: {line}")
                    raise e
            elif line.type == "separator":
                doc.add_node(HR(doc))
            elif line.type == "text":
                if line.value.strip().startswith("\\* ") or line.value.strip().startswith("\\!html") or line.value.strip().startswith("\\!var") or line.value.strip().startswith("\\!const") or line.value.strip().startswith("\\!include") or line.value.strip().startswith("\\!require"):
                    line.value = line.value.strip()[1:]
                try:
                    n = Hamill.parse_inner_string(doc, line.value)
                    doc.add_node(TextLine(doc, n))
                except Exception as e:
                    print(f"Error at line {count} on text: {line}")
                    raise e
            elif line.type in ["unordered_list", "ordered_list", "reverse_list"]:
                elem_is_unordered = False
                elem_is_ordered = False
                elem_is_reverse = False
                if line.type == "unordered_list":
                    elem_is_unordered = True
                elif line.type == "ordered_list":
                    elem_is_ordered = True
                elif line.type == "reverse_list":
                    elem_is_reverse = True
                if actual_list is None:
                    actual_list = ElementList(doc, None, elem_is_ordered or elem_is_reverse, elem_is_reverse)
                    actual_level = 1
                    starting_level = line.param
                # common code between lists
                # compute item level
                delimiter = delimiters[line.type]
                list_level = line.param; # Math.floor(line.value.find(delimiter) / 2) + 1
                # check coherency with the starting level
                if list_level < starting_level:
                    raise HamillException("Coherency error: a following item of list has a lesser level than its starting level.")
                else:
                    list_level = list_level - (starting_level - 1)
                # coherency
                if list_level == actual_level:
                    if (elem_is_unordered and (actual_list.ordered or actual_list.reverse)) or (elem_is_ordered and not actual_list.ordered) or (elem_is_reverse and not actual_list.reverse):
                        raise HamillException(f"Incoherency with previous item {actual_level} at this level {list_level}: ul:{elem_is_unordered} ol:{elem_is_unordered} r:{elem_is_reverse} vs o:{actual_list.ordered} r:{actual_list.reverse}")
                while list_level > actual_level:
                    last = actual_list.pop() # get and remove the last item
                    c = Composite(doc, actual_list) # create a new composite
                    c.add_child(last) # put the old last item in it
                    actual_list = actual_list.add_child(c) # link the new composite to the list
                    sub = ElementList(doc, c, elem_is_ordered, elem_is_reverse) # create a new list
                    actual_list = actual_list.add_child(sub)
                    actual_level += 1
                while list_level < actual_level:
                    actual_list = actual_list.get_parent()
                    if isinstance(actual_list, Composite):
                        # L'item était un composite, il faut remonter à la liste mère !
                        actual_list = actual_list.get_parent()
                    actual_level -= 1
                    if not isinstance(actual_list, ElementList):
                        raise HamillException(f"List incoherency: last element is not a list but a {actual_list.__class__.__name__}")
                # creation
                item_text = line.value[line.value.find(delimiter) + 2:].strip()
                item_nodes = Hamill.parse_inner_string(doc, item_text)
                actual_list.add_child(TextLine(doc, item_nodes))
            elif line.type == "html":
                doc.add_node(RawHTML(doc, line.value.replace("!html ", "").rstrip()))
            elif line.type == "css":
                text = line.value.replace("!css ", "").rstrip()
                doc.add_css(text)
            elif line.type == "include":
                include = line.value.replace("!include ", "").strip()
                doc.add_node(Include(doc, include))
            elif line.type == "require":
                text = line.value.replace("!require ", "").strip()
                doc.add_required(text)
            elif line.type == "const":
                text = line.value.replace("!const ", "").split("=")
                ids = text[0].strip()
                value = text[1].strip()
                doc.set_variable(ids, value, "string", True)
            elif line.type == "var":
                text = line.value.replace("!var ", "").split("=")
                ids = text[0].strip()
                value = text[1].strip()
                if value == "true": value = True
                if value == "TRUE": value = True
                if value == "false": value = False
                if value == "FALSE": value = False
                doc.add_node(SetVar(doc, ids, value, "boolean" if isinstance(value, bool) else "string", False))
            elif line.type == "label":
                value = line.value.replace("::", "", 1).strip() # Remove only the first
                text = value.split("::") # ???
                print('aaa', text)
                doc.add_label(text[0].strip(), text[1].strip()) # label, url
            elif line.type == "detail":
                value = line.value[2:-2].strip() # end : line.value.length - 2
                if value == "end":
                    doc.add_node(EndDetail(doc))
                else:
                    parts = value.split("->")
                    res = Hamill.parse_inner_markup(parts[0])
                    if len(parts) == 1 or len(parts[1].strip()) == 0:
                        doc.add_node(StartDetail(doc, res["text"].strip(), res["id"], res["class"]))
                    else:
                        # Detail simple <<summary -> content>>
                        doc.add_node(Detail(doc, res["text"].strip(), parts[1].strip(), res["id"], res["class"]))
            elif line.type == "div":
                value = line.value[2 : -2].strip()
                res = Hamill.parse_inner_markup(value)
                if res["text"] == "end":
                    doc.add_node(EndDiv(doc)) # We can put {{end .myclass #myid}} but it has no meaning except to code reading
                elif res["has_only_text"] and res["text"] != "begin":
                    print(res)
                    text = res["text"]
                    raise HamillException(f"Unknown quick markup: {text} in {line}")
                elif res["text"] == "begin" or res["text"] is None:
                    # begin can be omitted if there is no class nor id
                    doc.add_node(StartDiv(doc, res["id"], res["class"]))
            elif line.type == "comment":
                if line.value.startswith("!rem "):
                    doc.add_node(Comment(doc, line.value[4:]))
                else:
                    doc.add_node(Comment(doc, line.value[2:]))
            elif line.type == "row":
                content = line.value[1:-1]
                if len(content) == len(re.findall("[-|]", content) or []):
                    i = len(doc.nodes) - 1
                    while isinstance(doc.get_node(i), Row):
                        doc.get_node(i).is_header = True
                        i -= 1
                else:
                    parts = Hamill.escaped_split("|", content); # Handle escape
                    all_nodes = []
                    for p in parts:
                        nodes = Hamill.parse_inner_string(doc, p)
                        all_nodes.append(nodes)
                    doc.add_node(Row(doc, all_nodes))
            elif line.type == "empty":
                # Prevent multiple empty nodes
                if len(doc.nodes) == 0 or type(doc.nodes[-1]) != EmptyNode:
                    doc.add_node(EmptyNode(doc))
            elif line.type == "definition-header":
                definition = Hamill.parse_inner_string(doc, line.value)
            elif line.type == "definition-content":
                if definition == None:
                    raise HamillException("Definition content without header: " + line.value)
                doc.add_node(Definition(doc, definition, Hamill.parse_inner_string(doc, line.value)))
                definition = None
            elif line.type == "quote":
                res = {}
                res['class'] = None
                res['id'] = None
                if line.value == ">>>":
                    free = True
                    count += 1
                elif line.value.startswith(">>>"):
                    free = True
                    res = Hamill.parse_inner_markup(line.value[3:])
                    if res["has_text"]:
                        raise HamillException("A line starting a blockquote should only have a class or id indication not text")
                    count += 1
                while count < len(lines) and lines[count].type == "quote":
                    line = lines[count]
                    if not free and not line.value.startswith(">>"):
                        break
                    elif free and line.value == ">>>":
                        break
                    elif not free:
                        node_content += line.value[2:] + "\n"
                    else:
                        node_content += line.value + "\n"
                    count += 1
                doc.add_node(Quote(doc, node_content, res['class'], res['id']))
                if count < len(lines) and lines[count].type != "quote":
                    count -= 1
            elif line.type == "code":
                res = None
                if line.value == "@@@":
                    free = True
                    count += 1
                elif line.value.startswith("@@@"):
                    free = True
                    res = line.value[3:]
                    count += 1
                elif line.value.startswith("@@"):
                    res = line.value[2:]
                    if res in LANGUAGES:
                        count += 1 # skip
                while count < len(lines) and lines[count].type == "code":
                    line = lines[count]
                    if not free and not line.value.startswith("@@"):
                        break
                    elif free and line.value == "@@@":
                        break
                    elif not free:
                        node_content += line.value[2:] + "\n"
                    else:
                        node_content += line.value + "\n"
                    count += 1
                doc.add_node(Code(doc, node_content, None, None, res, False)); # res is the language
                if count < len(lines) and lines[count].type != "code":
                    count -= 1
            else:
                raise HamillException(f"Unknown {line.type}")
            count += 1
        # List
        if actual_list is not None:
            doc.add_node(actual_list.root())
        return doc

    # Find a pattern in a string. Pattern can be any character wide. Won't find any escaped pattern \pattern but will accept double escaped \\pattern
    @staticmethod
    def find(s, start, pattern):
        # String not big enough to have the motif
        if len(pattern) > len(s[start:]):
            return -1
        for i in range(start, len(s)):
            if s[i:i + len(pattern)] == pattern:
                if (i - 1 < start) \
                    or (i - 1 >= start and s[i - 1] != "\\") \
                    or (i - 2 < start) \
                    or (i - 2 >= start and s[i - 1] == "\\" and s[i - 2] == "\\"):
                    return i
        return -1

    @staticmethod
    def unescape_code(s):
        res = ""
        i = 0
        while i < len(s):
            char = s[i]
            nextc = s[i + 1] if i + 1 < len(s) else ""
            if char == "\\" and nextc == '@':
                res += "@"
                i += 1
            elif char == "\\" and nextc == "\\":
                res += "\\"
                i += 1
            else:
                res += char
            i += 1
        return res

    @staticmethod
    def parse_inner_string(doc, s):
        index = 0
        word = ""
        nodes = []
        matches = [
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
        ]
        modes = {
            "bold": False,
            "strong": False,
            "italic": False,
            "em": False,
            "underline": False,
            "sup": False,
            "sub": False,
            "stroke": False,
        }
        text_modifier_stack = []

        while index < len(s):
            char = s[index]
            nextc = s[index + 1] if index + 1 < len(s) else None
            next_next = s[index + 2] if index + 2 < len(s) else None
            prev = s[index - 1] if index - 1 >= 0 else None
            # Remplacement des glyphes
            # Glyphs - Quatuor
            if char == "#" and nextc == "#" and prev != "\\":
                if len(word) > 0:
                    nodes.append(
                        Text(doc, word[0:].strip())
                    )
                    word = ""
                nodes.append(BR(doc))
                index += 1; # set on the second #
                # in case of a ## b, the first space is removed by strip() above
                # and the second space by this :
                if index + 1 < len(s) and s[index + 1] == ' ':
                    index +=1
            elif char == "\\" and nextc == "\\" and next_next == "\\":
                # escape it
                word += "\\\\"
                index += 4
            # Text Styles
            else:
                match = None
                for pattern in matches:
                    if char == pattern[0] and nextc == pattern[1] and prev != "\\":
                        match = pattern[2]
                        break
                if match != None:
                    if len(word) > 0:
                        nodes.append(Text(doc, word))
                        word = ""
                    if match == "picture":
                        end = s.index("))", index)
                        if end == -1:
                            raise HamillException(f"Unclosed image in {s}")
                        content = s[index + 2:end]
                        res = Hamill.parse_inner_picture(content)
                        nodes.append(
                            Picture(
                                doc,
                                res["url"],
                                res["text"],
                                res["class"],
                                res["id"]
                            )
                        )
                        index = end + 1
                    elif match == "link":
                        end = s.find("]]", index)
                        if end == -1:
                            raise HamillException(f"Unclosed link in {s}")
                        content = s[index + 2:end]
                        parts = Hamill.escaped_split("->", content)
                        display = None
                        url = None
                        if len(parts) == 1:
                            url = parts[0].strip()
                        elif len(parts) == 2:
                            display = Hamill.parse_inner_string(
                                doc,
                                parts[0].strip()
                            )
                            url = parts[1].strip()
                        elif len(parts) > 2:
                            raise HamillException(f"Malformed link: {content}")
                        nodes.append(Link(doc, url, display))
                        index = end + 1
                    elif match == "markup":
                        end = s.index("}}", index)
                        if end == -1:
                            raise HamillException(f"Unclosed markup in {s}")
                        content = s[index + 2:end]
                        res = Hamill.parse_inner_markup(content)
                        if res["has_text"]:
                            nodes.append(
                                Span(
                                    doc,
                                    res["text"],
                                    res["id"],
                                    res["class"]
                                )
                            )
                        else:
                            nodes.append(
                                ParagraphIndicator(
                                    doc,
                                    res["id"],
                                    res["class"]
                                )
                            )
                        index = end + 1
                    elif match == "echo":
                        end = s.index("$$", index + 2)
                        if end == -1:
                            raise HamillException(f"Unclosed display in {s}")
                        content = s[index + 2:end]
                        nodes.append(GetVar(doc, content))
                        index = end + 1
                    elif match == "code":
                        is_code_ok = Hamill.find(s, index + 2, "@@")
                        if is_code_ok == -1:
                            raise HamillException(
                                "Unfinished inline code sequence: " + s
                            )
                        code_str = s[index + 2:is_code_ok]
                        lang = None
                        language = code_str.split(" ")[0]
                        if language in LANGUAGES:
                            lang = language
                            code_str = code_str[len(language)+1:] # remove the language and one space
                        nodes.append(Code(doc, Hamill.unescape_code(code_str), None, None, lang, True)) # unescape only @@ !
                        index = is_code_ok + 1 # will inc by 1 at the end of the loop
                    else:
                        # match with text modes
                        if not modes[match]:
                            modes[match] = True
                            text_modifier_stack.append([match, s])
                            nodes.append(Start(doc, match))
                        else:
                            modes[match] = False
                            last = text_modifier_stack.pop()
                            last_mode = last[0]
                            if last_mode != match:
                                raise HamillException(f"Incoherent stacking of the modifier: finishing {match} but {last_mode} should be closed first in {last[1]}")
                            nodes.append(Stop(doc, match))
                        index += 1
                # no match
                else:
                    word += char
            index += 1
        if len(word) > 0:
            nodes.append(Text(doc, word))
        if len(text_modifier_stack) > 0:
            last = text_modifier_stack.pop()
            raise HamillException(f"Unclosed {last[0]} text mode in {last[1]}.")
        return nodes

    @staticmethod
    def parse_inner_picture(content):
        res = None
        parts = content.split("->")
        if len(parts) == 1:
            return {
                "has_text": False,
                "has_only_text": False,
                "class": None,
                "id": None,
                "text": None,
                "url": parts[0],
            }
        else:
            content = parts[0]
            res = Hamill.parse_inner_markup(content)
            res["url"] = parts[1].strip()
        return res

    @staticmethod
    def parse_inner_markup(content):
        cls = None
        in_class = False
        ids = None
        in_ids = False
        text = None
        in_text = False
        for c in content:
            if c == "." and not in_class and not in_ids and not in_text and cls is None and text is None:
                in_class = True
                cls = ""
                continue
            elif c == ".":
                raise HamillException(f'Class or text already defined for this markup: {content}')

            if c == "#" and not in_class and not in_ids and not in_text and ids is None and text is None:
                in_ids = True
                ids = ""
                continue
            elif c == "#":
                raise HamillException(f'ID or text alreay defined for this markup: {content}')

            if c == " " and in_class:
                in_class = False

            if c == " " and in_ids:
                in_ids = False

            if c != " " and not in_class and not in_ids and not in_text and text is None:
                in_text = True
                text = ""

            if in_class:
                cls += c
            elif in_ids:
                ids += c
            elif in_text:
                text += c

        has_text = (text is not None)
        has_only_text = has_text and cls is None and ids is None
        return {
            "has_text": has_text,
            "has_only_text": has_only_text,
            "class": cls,
            "id": ids,
            "text": text,
        }
#------------------------------------------------------------------------------
# Functions
#------------------------------------------------------------------------------

tests = [
    # Comments, HR and BR
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
    # Titles
    ["### Title 3", '<h3 id="title-3">Title 3</h3>\n'],
    ["#Title 1", '<h1 id="title-1">Title 1</h1>\n'],
    # Paragraph
    ["a", "<p>a</p>\n"],
    ["a\n\n\n", "<p>a</p>\n"],
    ["a\nb\n\n", "<p>a<br>\nb</p>\n"],
    # Text modifications
    ["**bonjour**", "<p><b>bonjour</b></p>\n"],
    ["''italic''", "<p><i>italic</i></p>\n"],
    ["--strikethrough--", "<p><s>strikethrough</s></p>\n"],
    ["__underline__", "<p><u>underline</u></p>\n"],
    ["^^superscript^^", "<p><sup>superscript</sup></p>\n"],
    ["%%subscript%%", "<p><sub>subscript</sub></p>\n"],
    ["@@code@@", "<p><code>code</code></p>\n"],
    ["!!ceci est strong!!", "<p><strong>ceci est strong</strong></p>\n"],
    ["//ceci est emphase//", "<p><em>ceci est emphase</em></p>\n"],
    # Escaping
    ["\\**bonjour\\**", "<p>**bonjour**</p>\n"],
    [
        "@@code \\@@variable = '\\n' end@@",
        "<p><code>code @@variable = '\\n' end</code></p>\n",
    ],
    # Div, p and span
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
    # Details
    [
        "<<small -> petit>>",
        "<details><summary>small</summary>petit</details>\n",
    ],
    [
        "<<.reddetail small -> petit>>",
        '<details class="reddetail"><summary>small</summary>petit</details>\n',
    ],
    [
        "<<#mydetail small -> petit>>",
        '<details id="mydetail"><summary>small</summary>petit</details>\n',
    ],
    [
        "<<.reddetail #mydetail small -> petit>>",
        '<details id="mydetail" class="reddetail"><summary>small</summary>petit</details>\n',
    ],
    [
        "<<big>>\n* This is very big!\n* Indeed\n<<end>>",
        "<details><summary>big</summary>\n<ul>\n  <li>This is very big!</li>\n  <li>Indeed</li>\n</ul>\n</details>\n",
    ],
    [
        "<<.mydetail big>>\n* This is very big!\n* Indeed\n<<end>>",
        '<details class="mydetail"><summary>big</summary>\n<ul>\n  <li>This is very big!</li>\n  <li>Indeed</li>\n</ul>\n</details>\n',
    ],
    [
        "<<#reddetail big>>\n* This is very big!\n* Indeed\n<<end>>",
        '<details id="reddetail"><summary>big</summary>\n<ul>\n  <li>This is very big!</li>\n  <li>Indeed</li>\n</ul>\n</details>\n',
    ],
    [
        "<<#reddetail .mydetail big>>\n* This is very big!\n* Indeed\n<<end>>",
        '<details id="reddetail" class="mydetail"><summary>big</summary>\n<ul>\n  <li>This is very big!</li>\n  <li>Indeed</li>\n</ul>\n</details>\n',
    ],
    # Code
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
        '<p>Voici du code Ruby : <code><span class="ruby-keyword" title="token n°0 : keyword">if</span> <span class="ruby-identifier" title="token n°2 : identifier">a</span> <span class="ruby-operator" title="token n°4 : operator">==</span> <span class="ruby-integer" title="token n°6 : integer">5</span> <span class="ruby-keyword" title="token n°8 : keyword">then</span> <span class="ruby-identifier" title="token n°10 : identifier">puts</span><span class="ruby-separator" title="token n°11 : separator">(</span><span class="ruby-string" title="token n°12 : string">\'hello 5\'</span><span class="ruby-separator" title="token n°13 : separator">)</span> <span class="ruby-keyword" title="token n°15 : keyword">end</span></code></p>\n',
    ],
    [
        "@@ruby\n@@if a == 5 then\n@@    puts('hello 5')\n@@end\n",
        '<pre>\n\
<span class="ruby-keyword" title="token n°0 : keyword">if</span> <span class="ruby-identifier" title="token n°2 : identifier">a</span> <span class="ruby-operator" title="token n°4 : operator">==</span> <span class="ruby-integer" title="token n°6 : integer">5</span> <span class="ruby-keyword" title="token n°8 : keyword">then</span><span class="ruby-newline" title="token n°9 : newline">\n\
</span>    <span class="ruby-identifier" title="token n°11 : identifier">puts</span><span class="ruby-separator" title="token n°12 : separator">(</span><span class="ruby-string" title="token n°13 : string">\'hello 5\'</span><span class="ruby-separator" title="token n°14 : separator">)</span><span class="ruby-newline" title="token n°15 : newline">\n\
</span><span class="ruby-keyword" title="token n°16 : keyword">end</span><span class="ruby-newline" title="token n°17 : newline">\n\
</span></pre>\n'
    ],
    [
        "@@@ruby\nif a == 5 then\n    puts('hello 5')\nend\n@@@\n",
        '<pre>\n\
<span class="ruby-keyword" title="token n°0 : keyword">if</span> <span class="ruby-identifier" title="token n°2 : identifier">a</span> <span class="ruby-operator" title="token n°4 : operator">==</span> <span class="ruby-integer" title="token n°6 : integer">5</span> <span class="ruby-keyword" title="token n°8 : keyword">then</span><span class="ruby-newline" title="token n°9 : newline">\n\
</span>    <span class="ruby-identifier" title="token n°11 : identifier">puts</span><span class="ruby-separator" title="token n°12 : separator">(</span><span class="ruby-string" title="token n°13 : string">\'hello 5\'</span><span class="ruby-separator" title="token n°14 : separator">)</span><span class="ruby-newline" title="token n°15 : newline">\n\
</span><span class="ruby-keyword" title="token n°16 : keyword">end</span><span class="ruby-newline" title="token n°17 : newline">\n\
</span></pre>\n'
    ],
    # Quotes
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
        '<blockquote class="redquote">\nceci est une quote libre<br>\nqui s\'étend sur une autre ligne aussi<br>\n</blockquote>\n<p>Text normal</p>\n'
    ],
    [
        ">>>#myquote\nceci est une quote libre\nqui s'étend sur une autre ligne aussi\n>>>\nText normal",
        '<blockquote id="myquote">\nceci est une quote libre<br>\nqui s\'étend sur une autre ligne aussi<br>\n</blockquote>\n<p>Text normal</p>\n'
    ],
    [
        ">>>.redquote #myquote\nceci est une quote libre\nqui s'étend sur une autre ligne aussi\n>>>\nText normal",
        '<blockquote id="myquote" class="redquote">\nceci est une quote libre<br>\nqui s\'étend sur une autre ligne aussi<br>\n</blockquote>\n<p>Text normal</p>\n'
    ],
    [
        ">>>.redquote #myquote OH NON DU TEXTE !\nceci est une quote libre\nqui s'étend sur une autre ligne aussi\n>>>\nText normal",
        '<blockquote id="myquote" class="redquote">\nceci est une quote libre<br>\nqui s\'étend sur une autre ligne aussi<br>\n</blockquote>\n<p>Text normal</p>\n',
        "A line starting a blockquote should only have a class or id indication not text"
    ],
    # Lists
    [
        "* Bloc1\n  * A\n  * B\n* Bloc2\n  * C",
        "<ul>\n  <li>Bloc1\n    <ul>\n      <li>A</li>\n      <li>B</li>\n    </ul>\n  </li>\n  <li>Bloc2\n    <ul>\n      <li>C</li>\n    </ul>\n  </li>\n</ul>\n",
    ],
    ["  * A", "<ul>\n  <li>A</li>\n</ul>\n"],
    # Definition lists
    [
        "$ alpha\nFirst letter of the greek alphabet",
        "<dl>\n<dt>alpha</dt>\n<dd>First letter of the greek alphabet</dd>\n</dl>\n"
    ],
    [
        "!var PARAGRAPH_DEFINITION=true\n$ alpha\nFirst letter of the greek alphabet",
        "<dl>\n<dt>alpha</dt>\n<dd><p>First letter of the greek alphabet</p></dd>\n</dl>\n"
    ],
    # Tables
    [
        "|abc|def|",
        "<table>\n<tr><td>abc</td><td>def</td></tr>\n</table>\n"
    ],
    [
        "|abc|=def|",
        '<table>\n<tr><td>abc</td><td style="text-align: center">def</td></tr>\n</table>\n'
    ],
    [
        "|abc|>def|",
        '<table>\n<tr><td>abc</td><td style="text-align: right">def</td></tr>\n</table>\n'
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
    # Links
    [
        "[[https://www.spotify.com/]]",
        '<p><a href="https://www.spotify.com/">https://www.spotify.com/</a></p>\n'
    ],
    [
        "[[Spotify->https://www.spotify.com/]]",
        '<p><a href="https://www.spotify.com/">Spotify</a></p>\n'
    ],
    [
        "[[Spotify->grotify]]\n::grotify:: https://www.spotify.com/",
        '<p><a href="https://www.spotify.com/">Spotify</a></p>\n'
    ],
    [
        "## Youhou\n[[Go to title->youhou]]",
        '<h2 id="youhou">Youhou</h2>\n<p><a href="#youhou">Go to title</a></p>\n'
    ],
    [
        "[[Ceci est un mauvais lien->",
        "",
        "Unclosed link in [[Ceci est un mauvais lien->",
    ],
    [
        "{{#idp}} blablah\n\n[[#idp]]",
        '<p id="idp"> blablah</p>\n<p><a href="#idp">#idp</a></p>\n'
    ],
    [
        "[[Escaped \\-> link->https://www.spotify.com/]]",
        '<p><a href="https://www.spotify.com/">Escaped &ShortRightArrow; link</a></p>\n'
    ],
    # Images
    [
        "((https://fr.wikipedia.org/wiki/%C3%89douard_Detaille#/media/Fichier:Carabinier_de_la_Garde_imp%C3%A9riale.jpg))",
        '<p><img src="https://fr.wikipedia.org/wiki/%C3%89douard_Detaille#/media/Fichier:Carabinier_de_la_Garde_imp%C3%A9riale.jpg"/></p>\n'
    ],
    [
        "!const DEFAULT_FIND_IMAGE=doyoureallybelieveafterlove\n((pipo.jpg))",
        '<p><img src="doyoureallybelieveafterlove/pipo.jpg"/></p>\n'
    ],
    # Constants
    ["!const NUMCONST = 25\n$$NUMCONST$$", "<p>25</p>\n"],
    ["\\!const NOT A CONST", "<p>!const NOT A CONST</p>\n"],
    [
        "!const ALPHACONST = abcd\n!const ALPHACONST = efgh",
        "",
        "Can't set the value of the already set constant : ALPHACONST of type string",
    ],
    [
        "$$VERSION$$",
        f"<p>Hamill {VERSION}</p>\n"
    ],
    # Variables
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
        "You are trying to declare a variable which use the name of the constant TITLE"
    ],
    [
        "!const TITLE = TRYING\n!const TITLE = TRYING TOO",
        "",
        "Can't set the value of the already set constant : TITLE of type string"
    ],
    # Inclusion of HTML files
    ["!include include_test.html", "<h1>Hello World!</h1>\n"],
    [
        "\\!include I AM NOT AN INCLUDE",
        "<p>!include I AM NOT AN INCLUDE</p>\n",
    ],
    # Links to CSS and JavaScript files
    ["!require pipo.css", ""],
    [
        "\\!require I AM NOT A REQUIRE",
        "<p>!require I AM NOT A REQUIRE</p>\n",
    ],
    # Raw HTML and CSS
    ["!html <div>Hello</div>", "<div>Hello</div>\n"],
    [
        "\\!html <div>Hello</div>",
        "<p>!html &lt;div&gt;Hello&lt;/div&gt;</p>\n",
    ], # Error, the \ should be removed!
    ["!css p { color: pink;}", ""],
    # New feature
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
    # Default code
    [
        "!var DEFAULT_CODE=bnf\nYoupi j'aime bien les @@<règles>@@ !\n",
        '<p>Youpi j\'aime bien les <code><span class="bnf-keyword" title="token n°0 : keyword">&lt;règles&gt;</span></code> !</p>\n'
    ],
    # More tests
    [
        "* @@*@@ pour une liste non numérotée",
        "<ul>\n  <li><code>*</code> pour une liste non numérotée</li>\n</ul>\n"
    ],
    # Défaut code class and id
    [
        "!var NEXT_CODE_CLASS=cls\n!var NEXT_CODE_ID=ids\n@@@\nhello\n@@@",
        '<pre id="ids" class="cls">\nhello\n</pre>\n'
    ]
]

def run_all_tests(stop_on_first_error = True, stop_at = None):
    print("\n========================================================================")
    print("Starting tests")
    print("========================================================================")
    nb_ok = 0
    for index, t in enumerate(tests):
        if t is None or not isinstance(t, list) or (len(t) != 2 and len(t) != 3):
            raise HamillException("Test not well defined:", t)
        print("\n-------------------------------------------------------------------------")
        print(f"Test {index + 1} / {len(tests)}")
        print("-------------------------------------------------------------------------\n")
        if run_test(t[0], t[1], t[2] if len(t) == 3 else None):
            nb_ok += 1
        elif stop_on_first_error:
            raise HamillException("Stopping on first error")
        if stop_at is not None and stop_at == index + 1:
            print(f"Stopped at {stop_at}")
            break
    print(f"\nTests ok : {nb_ok} / {len(tests)}\n")

def run_test(text, result, error = None):
    try:
        doc = Hamill.process(text)
        output = doc.to_html()
        print("RESULT:")
        if output == "":
            print("EMPTY")
        else:
            print(output)
        if output == result:
            print("Test Validated")
            return True
        else:
            if result == "":
                result = "EMPTY"
            print(f"Error, expected:\n{result}")
            return False
    except Exception as e:
        print("RESULT:")
        if error != None and str(e) == error:
            print("Error expected:", str(e))
            print("Test Validated")
            return True
        elif error is not None:
            print("-- Unexpected error:")
            print(repr(e))
            traceback.print_tb(e.__traceback__)
            print(f"-- Another error was expected:\n{error}")
            return False
        else:
            print("Unexpected error:")
            print(repr(e))
            traceback.print_tb(e.__traceback__)
            print(f"-- No error was expected, expected:\n{result}")
            return False

#------------------------------------------------------------------------------
# Main
#------------------------------------------------------------------------------

do_test = False
DEBUG = True

if DEBUG:
    print(f"Running Hamill v{Hamill.VERSION}")

message = "---\n"
message += "> Use hamill.mjs --process (or -p) <input config filepath> to convert the HML file to HTML\n"
message += "  The file must be an object {} with a key named targets with an array value of pairs :\n"
message += '            ["inputFile", "outputDir"]\n'
message += f"> Use hamill.mjs --tests (or -t) to launch all the tests ({len(tests)}).\n"
message += "> Use hamill.mjs --eval (or -e) to run a read-eval-print-loop from hml to html\n"
message += "> Use hamill.mjs --help (or -h) to display this message"

if len(sys.argv) == 2:
    if sys.argv[1] == '--tests' or sys.argv[1] == '-t':
        do_test = True
    elif sys.argv[1] == "--eval" or sys.argv[1] == '-e':
        print('---')
        print('Type exit to quit')
        cmd = None
        while cmd != "exit":
            cmd = input('> ')
            if cmd != "exit":
                doc = Hamill.process(cmd)
                print(doc.to_html(False))
    elif sys.argv[1] == "--help" or sys.argv[1] == "-h":
        print(message)
    elif sys.argv[1] == "--process" or sys.argv[1] == "-p":
        print("You need to provide a configuration file")
    else:
        print("Unrecognized option(s). Type --help for help.")
elif len(sys.argv) == 3:
    if sys.argv[1] == '--process' or sys.argv[1] == '-p':
        filepath = sys.argv[2]
        if not os.path.isfile(filepath):
            raise HamillException(f"Impossible to find a valid hamill config file at {filepath}")
        workingDir = os.path.dirname(filepath)
        os.chdir(workingDir)
        print(f"Set current working directory: {os.getcwd()}")
        f = open(filepath, 'r', encoding='utf-8')
        config = json.load(f)
        f.close()
        for target in config["targets"]:
            if target[0] != "comment":
                inputFile = target[0]
                targetOK = os.path.isfile(inputFile)
                if not targetOK:
                    print(f"{inputFile} is an invalid target. Aborting.")
                    exit()
                outputDir = target[1]
                Hamill.process(
                    inputFile
                ).to_html_file(outputDir)
    else:
        print("Unrecognized options. Type --help for help.")
else:
    print(message)

if do_test:
    run_all_tests(True) #, 5)
