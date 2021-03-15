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
# For more information about the Hamill lightweight markup language see:
# https://xitog.github.io/dgx/informatique/hamill.html (in French)

"""Hamill: a simple lightweight markup language"""

#-------------------------------------------------------------------------------
# Imports
#-------------------------------------------------------------------------------

import os # for walk
import os.path # test if it is a directory or a file
import shutil
import locale
import datetime

from logging import info, warning, error

# Ugly hack to have the dev version of Weyland on my computer instead of the one loaded through pypi
could_be = [r"C:\Users\damie_000\Documents\GitHub\tallentaa\projets\weyland\weyland\__init__.py",
            '/home/damien/Documents/tallentaa/projets/weyland/weyland/__init__.py']
location = None
for cb in could_be:
    if os.path.exists(cb):
        location = cb
        break
if location is not None:
    import sys
    import importlib.util
    spec = importlib.util.spec_from_file_location("weyland", location)
    weyland = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = weyland
    spec.loader.exec_module(weyland)
    Lexer = weyland.Lexer
    RECOGNIZED_LANGUAGES = weyland.RECOGNIZED_LANGUAGES
    LANGUAGES = weyland.LANGUAGES
    __version__ = weyland.__version__
else:
    from weyland import Lexer, RECOGNIZED_LANGUAGES, LANGUAGES, __version__
print('Using Weyland version:', __version__)

#-------------------------------------------------------------------------------
# Constants and globals
#-------------------------------------------------------------------------------

LIST_STARTERS = {'* ': 'ul', '• ': 'ul', '% ': 'ol', '+ ' : 'ol', '- ': 'ol reversed'}
COMMENT_STARTER = '§§'

#-------------------------------------------------------------------------------
# Data model
#-------------------------------------------------------------------------------
# Generation class : contains the config of a generation
# - process_lines puts the result of the generation in lines
# - process_string returns directly the generated string
#-------------------------------------------------------------------------------

class Generation:

    def __init__(self, default_lang='en', default_encoding='utf-8',
                 default_code='text', default_find_image=None,
                 includes = None, links = None, inner_links = None,
                 error_locale=False):
        self.constants = {}
        self.variables = {}
        self.lines = []
        self.header_links = []
        self.header_css = []
        self.includes = [] if includes is None else includes
        self.links = {} if links is None else links
        self.inner_links = [] if inner_links is None else inner_links
        # 6 HTML constants
        self.constants['TITLE'] = None
        self.constants['ENCODING'] = default_encoding
        self.constants['LANG'] = default_lang
        self.constants['ICON'] = None
        self.constants['BODY_CLASS'] = None
        self.constants['BODY_ID'] = None
        # 1 generation constant
        try:
            dt = datetime.datetime.now()
            found = False
            # first try
            language_alias = {'en': ['en_US'], 'fr': ['fr_FR']}
            encoding_alias = {'utf-8': ['utf8'], 'utf8': ['utf-8']}
            all_alias = [(default_lang, default_encoding)]
            if default_lang in language_alias:
                for elem in language_alias[default_lang]:
                    all_alias.append((elem, default_encoding))
                    if default_encoding in encoding_alias:
                        for enco in encoding_alias[default_encoding]:
                            all_alias.append((elem, enco))
            for lg, en in all_alias:
                try:
                    locale.setlocale(locale.LC_TIME, (lg, en))
                    info(f'Locale set to {lg} and encoding {en}')
                    found = True
                    break
                except locale.Error:
                    pass
            # second try, our lang, our encoding
            if not found:
                for lang, encoding in locale.locale_alias.items():
                    if lang.startswith(default_lang) and default_encoding in encoding.lower():
                        try:
                            locale.setlocale(locale.LC_TIME, (lang, encoding))
                            info(f'Locale set to {lang} and encoding {encoding}')
                            found = True
                            break
                        except locale.Error:
                            if (error_locale):
                                warning(f'Impossible to set locale to ({lang}, {encoding}).')
                            pass
            # third try, our lang, any encoding
            if not found:
                for lang, encoding in locale.locale_alias.items():
                    if lang.startswith(default_lang):
                        try:
                            locale.setlocale(locale.LC_TIME, (lang, encoding))
                            found = True
                            warning(f'Locale not found for ({default_lang}, {default_encoding}), defaulting to ({lang}, {encoding})')
                            break
                        except locale.Error:
                            if (error_locale):
                                warning(f'Impossible to set locale to ({lang}, {encoding}).')
                            pass
            # last try, ugly fix for Windows 7
            if not found:
                res = locale.setlocale(locale.LC_TIME, '')
                warning(f'Locale not found for {default_lang} in any encoding. Setting to default: {res}')
            self.constants['GENDATE'] = dt.strftime("%d %B %Y")
            #self.constants['GENDATE'] = f'{dt.year}/{dt.month}/{dt.day}'
        except KeyError:
            self.constants['GENDATE'] = f'{dt.day}/{dt.month}/{dt.year}'
        # 2 var from markup {{.cls}} or {{#id}}
        self.variables['EXPORT_COMMENT'] = False
        self.variables['DEFINITION_AS_PARAGRAPH'] = False
        self.variables['DEFAULT_CODE'] = default_code
        self.variables['DEFAULT_PAR_CLASS'] = None
        self.variables['NEXT_PAR_CLASS'] = None
        self.variables['NEXT_PAR_ID'] = None
        self.variables['DEFAULT_TAB_CLASS'] = None
        self.variables['NEXT_TAB_CLASS'] = None
        self.variables['NEXT_TAB_ID'] = None
        self.variables['DEFAULT_FIND_IMAGE'] = default_find_image

    def first(self):
        return self.lines[0]

    def __getitem__(self, key):
        if isinstance(key, str):
            if key in self.constants:
                return self.constants[key]
            elif key in self.variables:
                return self.variables[key]
            else:
                raise Exception('Key not known: ' + str(key))

    def __setitem__(self, key, value):
        if isinstance(key, str):
            if key in self.constants:
                self.constants[key] = value
            elif key in self.variables:
                self.variables[key] = value
            else:
                raise Exception('Key not known: ' + str(key))

    def append(self, line):
        self.lines.append(line)

    def __iter__(self):
        for line in self.lines:
            yield line

    def __str__(self):
        return ''.join(self.lines)

#-------------------------------------------------------------------------------
# Tool functions
#-------------------------------------------------------------------------------
# count_list_level: count the list level starting a line
# super_strip     : strip and remove comments
# prev_next       : get prev, next, prev_prev from a string
# multi_start     : if a string starts with one of the starters defined
# multi_find      : if a string contains one of the motif
# find_unsescaped : if a string contains a motif unescaped
# escape          : handles escaped characters
# safe            : transform some characters
# find_title      : find a title
# make_id         : make an id from a string (replace ' ' by '-' and lower)
# write_code      : write code by creating a list of tokens
#-------------------------------------------------------------------------------

def count_list_level(line):
    """Return the level of the list, the kind of starter and if it is
       a continuity of a previous level."""
    starter = line[0]
    if starter + ' ' not in LIST_STARTERS:
        raise Exception('Unknown list starter: ' + line[0] + ' in ' + line)
    level = 0
    continuity = False
    while line.startswith(starter + ' '):
        level += 1
        line = line[2:]
    if line.startswith('| '):
        level += 1
        continuity = True
    return level, starter, continuity


def super_strip(line):
    """Remove any blanks at the start or the end of the string AND the comments §§"""
    line = line.strip()
    if len(line) == 0:
        return line
    index = find_unescaped(line, COMMENT_STARTER)
    if index != -1:
        return line[:index].strip()
    else:
        return line


def prev_next(line, index):
    if index > 0:
        _prev = line[index - 1]
    else:
        _prev = None
    if index > 1:
        _prev_prev = line[index - 2]
    else:
        _prev_prev = None
    if index < len(line) - 1:
        _next = line[index + 1]
    else:
        _next = None
    return _prev, _next, _prev_prev


def multi_start(string, starts):
    for key in starts:
        if string.startswith(key):
            return key


def multi_find(string, finds):
    for key in finds:
        if find_unescaped(string, key) != -1:
            return key
    return None


def find_unescaped(line, motif, start=0):
    "Used by super_strip, code handling and multi_find"
    index = start
    while index < len(line):
        found = line.find(motif, index)
        if found == -1:
            break
        elif found == 0 or line[found - 1] != '\\':
            return found
        else:
            index = found + 1 #len(motif)
    return -1


def escape(line):
    # Escaping
    if line.find('\\') == -1:
        return line
    new_line = ''
    index_char = 0
    while index_char < len(line):
        char = line[index_char]
        _, next_char, _ = prev_next(line, index_char)
        if char == '\\' and next_char in ['*', "'", '^', '-', '_', '[', '@', '%', '+', '$', '!', '|', '{', '•']:
            new_line += next_char
            index_char += 2    
        else:
            new_line += char
            index_char += 1
    return new_line


def safe(line):
    # Do not escape !html line
    if line.startswith('!html'):
        return line
    # Replace special glyph
    line = line.replace('<==', '⇐')
    line = line.replace('==>', '⇒')
    # Replace HTML special char
    new_line = ''
    index_char = 0
    escape = False
    while index_char < len(line):
        char = line[index_char]
        prev_char, next_char, _ = prev_next(line, index_char)
        # replace
        if char == '@' and next_char == '@':
            escape = not escape
        if not escape:
            if char == '&':
                new_line += '&amp;'
            elif char == '<':
                new_line += '&lt;'
            elif char == '>' and next_char == '>' and index_char == 0: # must not replace >>
                new_line += '>>'
                index_char += 1
            elif char == '>' and prev_char not in ['-', '[', '|']: # must not replace -> and [> and |>
                new_line += '&gt;'
            else:
                new_line += char
        else:
            new_line += char
        index_char += 1
    return new_line


def find_title(line):
    c = 0
    nb = 0
    while c < len(line):
        if line[c] == '#':
            nb += 1
        else:
            break
        c += 1
    if nb > 0:
        title = line.replace('#' * nb, '', 1).strip()
        id_title = make_id(title)
        return nb, title, id_title
    return 0, None, None


def make_id(string):
    """Translate : A simple Title -> a_simple_title"""
    return string.replace(' ', '-').lower()


def write_code(line, code_lang):
    line = line.replace('\\@', '@') # warning bug if \\@
    #print('write_code', code_lang, line)
    return Lexer(LANGUAGES[code_lang], debug=False).to_html(text=line)


def check_link(link, links, inner_links):
    if multi_start(link, ('https://', 'http://')):
        pass
    elif make_id(link) in inner_links:
        link = '#' + make_id(link)
    elif link in inner_links:
        link = '#' + link
    elif link in links:
        link = links[link]
    else:
        warning(f'Undefined link: {link}')
    return link


#-------------------------------------------------------------------------------
# Processors functions
#-------------------------------------------------------------------------------

def process_string(line, gen=None):
    gen = Generation() if gen is None else gen
    new_line = ''
    in_bold = False
    in_italic = False
    in_strikethrough = False
    in_underline = False
    in_power = False
    in_code = False
    code = ''
    char_index = -1
    while char_index < len(line) - 1:
        char_index += 1
        char = line[char_index]
        prev_char, next_char, prev_prev_char = prev_next(line, char_index)
        # Paragraph et span class (div class are handled elsewhere)
        if char == '{' and next_char == '{' and prev_char != '\\' and line.find('}}', char_index+1) != -1:
            continue
        if char == '{' and prev_char == '{' and prev_prev_char != '\\':
            ending = line.find('}}', char_index)
            if ending != -1:
                inside = line[char_index + 1:ending]
                cls = ''
                ids = ''
                txt = ''
                state = 'start'
                for c in inside:
                    if state == 'start':
                        if c == '.':
                            state = 'cls'
                            cls += c
                        elif c == '#':
                            state = 'ids'
                            ids += c
                        else:
                            state = 'txt'
                            txt += c
                    elif state == 'cls':
                        if c != ' ':
                            cls += c
                        else:
                            state = 'start'
                    elif state == 'ids':
                        if c != ' ':
                            ids += c
                        else:
                            state = 'start'
                    elif state == 'txt': # you can't escape txt mode
                        txt += c
                if len(txt) > 0:
                    if len(ids) > 0 and len(cls) > 0:
                        new_line += f'<span id="{ids[1:]}" class="{cls[1:]}">{txt}</span>'
                    elif len(ids) > 0:
                        new_line += f'<span id="{ids[1:]}">{txt}</span>'
                    elif len(cls) > 0:
                        new_line += f'<span class="{cls[1:]}">{txt}</span>'
                    else:
                        new_line += f'<span>{txt}</span>'
                else:
                    if len(ids) > 0:
                        gen['NEXT_PAR_ID'] = ids[1:]
                    if len(cls) > 0:
                        gen['NEXT_PAR_CLASS'] = cls[1:]
                char_index = ending + 1
                continue
        # Links and images
        if char == '[' and prev_char != '\\' and next_char != '[': # [[ the first is not a link!
            ending = line.find(']', char_index)
            if ending != -1:
                is_link = True
                if next_char == '#': # [# ... ] creating inner link
                    link_name = line[char_index + 2:ending]
                    id_link = make_id(link_name)
                    new_line += f'<span id="{id_link}">{link_name}</span>'
                elif next_char == '!': # [! ... ] image
                    link = line[char_index + 2:ending]
                    if gen['DEFAULT_FIND_IMAGE'] is None:
                        new_line += f'<img src="{link}"></img>'
                    else:
                        new_line += f'<img src="{gen["DEFAULT_FIND_IMAGE"]}{link}"></img>'
                elif next_char == '>': # [> ... ] direct URL or REF
                    link_or_name = line[char_index + 2:ending]
                    link = check_link(link_or_name, gen.links, gen.inner_links)
                    new_line += f'<a href="{link}">{link_or_name}</a>'
                elif next_char == '=': # [= ... ] display a value
                    ids = line[char_index + 2:ending]
                    if ids in gen.constants:
                        new_line += str(gen.constants[ids])
                    elif ids in gen.variables:
                        new_line += str(gen.variables[ids])
                    else:
                        warning(f'Undefined identifier: {ids}')
                        new_line += '<undefined>'
                elif line[char_index + 1:ending].find('->') != -1: # [ name -> direct URL | REF | # ]
                    link = line[char_index + 1:ending]
                    link_name, link = link.split('->', 1)
                    if link == '#':
                        link = link_name
                    # Check link
                    link = check_link(link, gen.links, gen.inner_links)
                    # Make link
                    link_name = process_string(link_name, gen)
                    new_line += f'<a href="{link}">{link_name}</a>'
                else:
                    is_link = False
                if is_link:
                    char_index = ending
                    continue
        # Italic
        if char == "'" and next_char == "'" and prev_char != '\\':
            continue
        if char == "'" and prev_char == "'" and prev_prev_char != '\\':
            if not in_italic and next_char is not None and line.find("''", char_index + 1) != -1:
                new_line += '<i>'
                in_italic = True
            elif in_italic:
                new_line += '</i>'
                in_italic = False
            else:
                new_line += "''"
            continue
        # Strong
        if char == '*' and next_char == '*' and prev_char != '\\':
            continue
        if char == '*' and prev_char == '*' and prev_prev_char != '\\':
            if not in_bold and next_char is not None and line.find("**", char_index + 1) != -1:
                new_line += '<b>'
                in_bold = True
            elif in_bold:
                new_line += '</b>'
                in_bold = False
            else:
                new_line += '**'
            continue
        # Strikethrough
        if char == '-' and next_char == '-' and prev_char != '\\':
            continue
        if char == '-' and prev_char == '-' and prev_prev_char != '\\':
            if not in_strikethrough and next_char is not None and line.find("--", char_index + 1) != -1:
                new_line += '<s>'
                in_strikethrough = True
            elif in_strikethrough:
                new_line += '</s>'
                in_strikethrough = False
            else:
                new_line += '--'
            continue
        # Underline
        if char == '_' and next_char == '_' and prev_char != '\\':
            continue
        if char == '_' and prev_char == '_' and prev_prev_char != '\\':
            if not in_underline and next_char is not None and line.find("__", char_index + 1) != -1:
                new_line += '<u>'
                in_underline = True
            elif in_underline:
                new_line += '</u>'
                in_underline = False
            else:
                new_line += '__'
            continue
        # Power
        if char == '^' and next_char == '^' and prev_char != '\\':
            continue
        if char == '^' and prev_char == '^' and prev_prev_char != '\\':
            if not in_power and next_char is not None and line.find("^^", char_index + 1) != -1:
                new_line += '<sup>'
                in_power = True
            elif in_power:
                new_line += '</sup>'
                in_power = False
            else:
                new_line += '^^'
            continue
        # Code
        if char == '@' and next_char == '@' and prev_char != '\\':
            continue
        if char == '@' and prev_char == '@' and prev_prev_char != '\\':
            if next_char is not None and line.find("@@", char_index + 1) != -1:
                ending = find_unescaped(line, '@@', char_index)
                code = line[char_index + 1:ending]
                length = len(code) + 2
                s = multi_start(code, RECOGNIZED_LANGUAGES)
                if s is not None:
                    code = code.replace(s + ' ', '', 1) # delete also the space between the language and the actual code
                else:
                    s = gen['DEFAULT_CODE']
                new_line += '<code>' + write_code(code, s) + '</code>'
                char_index += length
            else:
                new_line += '@@'
            continue
        new_line += char
    return new_line


def process_constvar(line):
    if line.startswith('!const'):
        command, value = line.replace('!const ', '').split('=')
    elif line.startswith('!var'):
        command, value = line.replace('!var ', '').split('=')
    else:
        raise Exception('No variable or constant defined here: ' + line)
    command = command.strip()
    value = value.strip()
    return command, value


def process_file(input_name, output_name=None, default_lang=None, includes=None):
    info(f'Processing file: {input_name}')
    if not os.path.isfile(input_name):
        raise Exception('Process_file: Invalid source file: ' + str(input_name))
    source = open(input_name, mode='r', encoding='utf8')
    content = source.readlines()
    source.close()

    result = process_lines(content,
                           Generation(default_lang=default_lang, includes=includes))

    if output_name is None:
        if input_name.endswith('.hml'):
            output_name = input_name.replace('.hml', '.html')
        else:
            output_name = input_name + '.html'
    output = open(output_name, mode='w', encoding='utf8')

    # Header
    if result["LANG"] is not None:
        output.write(f'<html lang="{result["LANG"]}">\n')
    else:
        output.write(f'<html>\n')
    output.write('<head>\n')
    output.write(f'  <meta charset={result["ENCODING"]}>\n')
    output.write('  <meta http-equiv="X-UA-Compatible" content="IE=edge">\n')
    output.write('  <meta name="viewport" content="width=device-width, initial-scale=1">\n')
    if result["TITLE"] is not None:
        output.write(f'  <title>{result["TITLE"]}</title>\n')
    if result["ICON"] is not None:
        output.write(f'  <link rel="icon" href="{result["ICON"]}" type="image/x-icon" />\n')
        output.write(f'  <link rel="shortcut icon" href="{result["ICON"]}" type="image/x-icon" />\n')

    # Should I put script in head?
    for line in result.header_links:
        output.write(line)
    # Inline CSS
    for line in result.header_css:
        output.write('<style type="text/css">\n')
        output.write(line + '\n')
        output.write('</style>\n')

    output.write('</head>\n')

    if result["BODY_CLASS"] is None and result["BODY_ID"] is None:
        output.write('<body>\n')
    elif result["BODY_ID"] is None:
        output.write(f'<body class="{result["BODY_CLASS"]}">\n')
    elif result["BODY_CLASS"] is None:
        output.write(f'<body id="{result["BODY_ID"]}">\n')
    else:
        output.write(f'<body id="{result["BODY_ID"]}" class="{result["BODY_CLASS"]}">\n')

    for line in result:
        output.write(line)

    output.write('</body>')
    output.close()


def output_list(gen, list_array):
    heap = []
    closed = False
    for index in range(len(list_array)):
        elem = list_array[index]
        level = elem['level']
        starter = LIST_STARTERS[elem['starter'] + ' ']
        ender = starter[:2]
        line = elem['line']
        cont = elem['cont']
        # Iterate
        if index > 0:
            prev_level = list_array[index - 1]['level']
        else:
            prev_level = None
        if index < len(list_array) - 1:
            next_level = list_array[index + 1]['level']
            next_cont = list_array[index + 1]['cont']
        else:
            next_level = None
            next_cont = None
        # Output
        if prev_level is None or level > prev_level:
            start = 0 if prev_level is None else prev_level
            for current in range(start, level):
                gen.append('    ' * current + f'<{starter}>\n')
                heap.append(ender)
                if current < level - 1:
                    gen.append('    ' * current + f'  <li>\n')
        elif prev_level == level:
            current = level - 1
            if not closed and not cont:
                    gen.append('    ' * current + '  </li>\n')
        elif level < prev_level:
            start = prev_level
            for current in range(start, level, -1):
                ender = heap[-1]
                if current != start:
                    gen.append('    ' * (current - 1) + '  </li>\n')
                gen.append('    ' * (current - 1) + f'</{ender}>\n')
                heap.pop()
            current -= 2
            gen.append('    ' * current + '  </li>\n')
        # Line
        s = '    ' * current + '  '
        if cont:
            s += '<br>'
        else:
            s += '<li>'
        s += line
        if (next_level is None or next_level <= level) and not (next_level == level and next_cont):
            s += '</li>\n'
            closed = True
        #elif next_cont is not None and not next_cont)
        else:
            s += '\n'
            closed = False
        gen.append(s)
    if len(heap) > 0:
        while len(heap) > 0:
            ender = heap[-1]
            if not closed:
                gen.append('    ' * (len(heap) - 1) + '  </li>\n')
            gen.append('    ' * (len(heap) - 1) + f'</{ender}>\n')
            closed = False
            heap.pop()


def process_lines(lines, gen=None):
    gen = Generation() if gen is None else gen
    # The 6 HTML constants are defined in Result class
    in_table = False
    in_definition_list = False
    in_code_free_block = False
    in_code_block = False
    in_pre_block = False
    code_lang = None
    
    # 1st Pass : prefetch links, replace special HTML char, skip comments
    # Empty line must be kept to separate lists!
    after = []
    for line in lines:
        # Constant must be read first, are defined once, anywhere in the doc
        if line.startswith('!const '):
            command, value = process_constvar(line)
            if command == 'TITLE':
                gen["TITLE"] = value
            elif command == 'ENCODING':
                gen["ENCODING"] = value
            elif command == 'ICON':
                gen["ICON"] = value
            elif command == 'LANG':
                gen["LANG"] = value
            elif command == 'BODY_CLASS':
                gen["BODY_CLASS"] = value
            elif command == 'BODY_ID':
                gen["BODY_ID"] = value
            else:
                raise Exception('Unknown constant: ' + command + 'with value= ' + value)
        elif line.startswith('!require ') and super_strip(line).endswith('.css'):
            required = super_strip(line.replace('!require ', '', 1))
            gen.header_links.append(f'  <link href="{required}" rel="stylesheet">\n')
        # Inline CSS
        elif line.startswith('!css '):
            gen.header_css.append(super_strip(line.replace('!css ', '', 1)))
        else:
            # Block of code
            if len(line) > 2 and line[0:3] == '@@@':
                if not in_code_free_block:
                    in_code_free_block = True
                else:
                    in_code_free_block = False
            if line.startswith('@@'):
                in_code_block = True
            else:
                in_code_block = False
            # Strip
            if not in_code_free_block and not in_code_block:
                line = super_strip(line)
            # Special chars
            line = safe(line)
            # Link library
            if len(line) > 0 and line[0] == '[' and multi_find(line, [']: https://', ']: http://']):
                name = line[1:line.find(']: ')]
                link = line[line.find(']: ') + len(']: '):]
                gen.links[name] = link
                continue
            # Inner links
            if line.find('[#') != -1:
                char_index = 0
                while char_index < len(line):
                    char = line[char_index]
                    prev_char, next_char, prev_prev_char = prev_next(line, char_index)
                    if char == '[' and next_char == '#' and prev_char != '\\': # [# ... ] inner link
                        ending = line.find(']', char_index)
                        if ending != -1:
                            link_name = line[char_index + 2:ending]
                            id_link = make_id(link_name)
                            if id_link in gen.inner_links:
                                warning(f"Multiple definitions of anchor: {id_link}")
                            gen.inner_links.append(id_link)
                            char_index = ending
                            continue
                    char_index += 1
            # Inner links from Title
            nb, title, id_title = find_title(line)
            if nb > 0:
                gen.inner_links.append(id_title)
            after.append(line)
    content = after
    
    # Start of output
    list_array = []
    
    # 2nd Pass
    index = -1
    while index < len(content) - 1:
        index += 1
        line = content[index]
        # Next line
        if index < len(content) - 2:
            next_line = content[index + 1]
        else:
            next_line = None
        # Variables
        if line.startswith('!var '):
            command, value = process_constvar(line)
            if command == 'EXPORT_COMMENT':
                if value == 'true':
                    gen['EXPORT_COMMENT'] = True
                elif value == 'false':
                    gen['EXPORT_COMMENT'] = False
            elif command == 'PARAGRAPH_DEFINITION':
                if value == 'true':
                    gen['DEFINITION_AS_PARAGRAPH'] = True
                else:
                    gen['DEFINITION_AS_PARAGRAPH'] = False
            elif command == 'DEFAULT_CODE':
                if value in RECOGNIZED_LANGUAGES:
                    gen['DEFAULT_CODE'] = value
                else:
                    warning(f'Not recognized language in var VAR_DEFAULT_CODE: {value}')
            elif command == 'NEXT_PAR_ID':
                gen['NEXT_PAR_ID'] = value if value != 'reset' else None
            elif command == 'NEXT_PAR_CLASS':
                gen['NEXT_PAR_CLASS'] = value if value != 'reset' else None
            elif command == 'DEFAULT_PAR_CLASS':
                gen['DEFAULT_PAR_CLASS'] = value if value != 'reset' else None
            elif command == 'NEXT_TAB_CLASS':
                gen['NEXT_TAB_CLASS'] = value if value != 'reset' else None
            elif command == 'NEXT_TAB_ID':
                gen['NEXT_TAB_ID'] = value if value != 'reset' else None
            elif command == 'DEFAULT_TAB_CLASS':
                gen['DEFAULT_TAB_CLASS'] = value if value != 'reset' else None
            elif command == 'DEFAULT_FIND_IMAGE':
                gen['DEFAULT_FIND_IMAGE'] = value if value != 'reset' else None
            else:
                raise Exception('Var unknown: ' + command + ' with value = ' + value)
            continue
        # Comment
        if line.startswith(COMMENT_STARTER):
            if gen['EXPORT_COMMENT']:
                line = line.replace(COMMENT_STARTER, '<!--', 1) + ' -->'
                gen.append(line + '\n')
            continue
        # Require CSS or JS file
        if line.startswith('!require '):
            required = line.replace('!require ', '', 1)
            if required.endswith('.js'):
                gen.append(f'  <script src="{required}"></script>\n')
            else:
                raise Exception("I don't known how to handle this file: " + required)
            continue
        # Include HTML file
        if line.startswith('!include '):
            included = line.replace('!include ', '', 1).strip()
            if gen.includes is not None:
                filepath = None
                for file in gen.includes:
                    if os.path.basename(file) == included:
                        filepath = file
                if filepath is not None:
                    file = open(filepath, mode='r', encoding='utf8')
                    file_content = file.read()
                    file.close()
                    gen.append(file_content + '\n')
                else:
                    warning(f'Included file {included} not found in includes.')
            else:
                warning('No included files for generation.')
            continue
        # Inline HTML
        if line.startswith('!html '):
            gen.append(line.replace('!html ', '', 1) + '\n')
            continue
        # HR
        if line.startswith('---'):
            if line.count('-') == len(line):
                gen.append('<hr>\n')
                continue
        # BR
        if line.find(' !! ') != -1:
            line = line.replace(' !! ', '<br>')
        # Block of pre
        if line.startswith('>>'):
            if not in_pre_block:
                gen.append('<pre>\n')
                in_pre_block = True
            line = escape(line[2:])
            gen.append(line + '\n')
            continue
        elif in_pre_block:
            gen.append('</pre>\n')
            in_pre_block = False
        # Block of code 1
        if len(line) > 2 and line[0:3] == '@@@':
            if not in_code_free_block:
                gen.append('<pre class="code">\n')
                in_code_free_block = True
                code_lang = line.replace('@@@', '', 1).strip()
                if len(code_lang) == 0:
                    code_lang = gen['DEFAULT_CODE']
            else:
                gen.append('</pre>\n')
                in_code_free_block = False
            continue 
        # Block of code 2
        if line.startswith('@@') and (len(super_strip(line)) == 2 or line[2] != '@'):
            if not in_code_block:
                gen.append('<pre class="code">\n')
                in_code_block = True
                code_lang = super_strip(line.replace('@@', '', 1))
                if len(code_lang) == 0:
                    code_lang = gen['DEFAULT_CODE']
                continue
        elif in_code_block:
            gen.append('</pre>\n')
            in_code_block = False
        if in_code_free_block or in_code_block:
            if in_code_block:
                line = line[2:] # remove starting @@
            gen.append(write_code(line, code_lang))
            continue
        # Div {{#ids .cls}}
        if line.startswith('{{') and line.endswith('}}'):
            inside = line[2:-2]
            if inside == 'end':
                gen.append('</div>\n')
            else:
                cls = ''
                ids = ''
                state = 'start'
                for c in inside:
                    # state
                    if c == '.':
                        state = 'cls'
                    elif c == ' ':
                        state = 'start'
                    elif c == '#':
                        state = 'ids'
                    # save
                    if state == 'cls':
                        cls += c
                    elif state == 'ids':
                        ids += c
                if len(cls) > 0 and len(ids) > 0:
                    gen.append(f'<div id="{ids[1:]}" class="{cls[1:]}">\n')
                elif len(cls) > 0:
                    gen.append(f'<div class="{cls[1:]}">\n')
                elif len(ids) > 0:
                    gen.append(f'<div id="{ids[1:]}">\n')
                else:
                    gen.append(f'<div id="{cls}">\n')
            continue
        # Bold & Italic & Strikethrough & Underline & Power
        if multi_find(line, ('**', '--', '__', '^^', "''", "[", '@@', '{{')) and \
           not line.startswith('|-'):
            line = process_string(line, gen)
        # Title
        nb, title, id_title = find_title(line)
        if nb > 0:
            line = f'<h{nb} id="{id_title}">{title}</h{nb}>\n'
            gen.append(line)
            continue
        # Liste
        found = multi_start(line, LIST_STARTERS)
        if found:
            level, starter, cont = count_list_level(line)
            list_array.append({'level': level, 'starter': starter, 'line': escape(line[level * 2:]), 'cont': cont})
            continue
        elif len(list_array) > 0 and len(line) > 0 and line[0] == '|':
            level = list_array[-1]['level']
            starter = list_array[-1]['starter']
            list_array.append({'level': level, 'starter': starter, 'line': escape(line[2:]), 'cont': True})
            continue
        elif len(list_array) > 0:
            output_list(gen, list_array)
            list_array = []
        # Table
        if len(line) > 0 and line[0] == '|':
            if not in_table:
                if gen['NEXT_TAB_CLASS'] is not None:
                    cls = f' class="{gen["NEXT_TAB_CLASS"]}"'
                    gen['NEXT_TAB_CLASS'] = None
                elif gen['DEFAULT_TAB_CLASS'] is not None:
                    cls = f' class="{gen["DEFAULT_TAB_CLASS"]}"'
                else:
                    cls = ''
                if gen['NEXT_TAB_ID'] is not None:
                    ids = f' id="{gen["NEXT_TAB_ID"]}"'
                    gen['NEXT_TAB_ID'] = None
                else:
                    ids = ''
                gen.append(f'<table{ids}{cls}>\n')
                in_table = True
            if next_line is not None and next_line.startswith('|-'):
                element = 'th'
            else:
                element = 'td'
            columns = line.split('|')
            skip = True
            for col in columns:
                if len(col.replace('-', '').strip()) != 0:
                    skip = False
            if not skip:
                gen.append('<tr>')
                for col in columns:
                    if col != '':
                        # center or right-align
                        if len(col) > 0 and col[0] == '>':
                            align = ' align="right"'
                            col = col[1:]
                        elif len(col) > 0 and col[0] == '=':
                            align = ' align="center"'
                            col = col[1:]
                        else:
                            align = ''
                        # row and col span
                        span = ''
                        if len(col) > 0 and col[0] == '#':
                            if len(col) > 1 and col[1] in ['c', 'r']:
                                ending = col.find('#', 1)
                                if ending != -1:
                                    if col[1] == 'c':
                                        span = f' colspan={int(col[2:ending])}'
                                    else:
                                        span = f' rowspan={int(col[2:ending])}'
                                    col = col[ending+1:]
                        val = process_string(escape(col), gen)         
                        gen.append(f'<{element}{align}{span}>{val}</{element}>')
                gen.append('</tr>\n')
            continue
        elif in_table:
            gen.append('</table>\n')
            in_table = False
        # Definition list
        if line.startswith('$ '):
            if not in_definition_list:
                in_definition_list = True
                gen.append('<dl>\n')
            else:
                gen.append('</dd>\n')
            gen.append(f'<dt>{line.replace("$ ", "", 1)}</dt>\n<dd>\n')
            continue
        elif len(line) != 0 and in_definition_list:
            if not gen['DEFINITION_AS_PARAGRAPH']:
                gen.append(escape(line) +'\n')
            else:
                gen.append('<p>' + escape(line) +'</p>\n')
            continue
        # empty line
        elif len(line) == 0 and in_definition_list:
            in_definition_list = False
            gen.append('</dl>\n')
            continue
        # Replace escaped char
        line = escape(line)
        # Paragraph
        if len(line) > 0:
            cls = f'class="{gen["DEFAULT_PAR_CLASS"]}"' if gen['DEFAULT_PAR_CLASS'] is not None else ''
            cls = f'class="{gen["NEXT_PAR_CLASS"]}"' if gen['NEXT_PAR_CLASS'] is not None else cls
            ids = f'id="{gen["NEXT_PAR_ID"]}"' if gen['NEXT_PAR_ID'] is not None else ''
            space1 = ' ' if len(cls) > 0 or len(ids) > 0 else ''
            space2 = ' ' if len(cls) > 0 and len(ids) > 0 else ''
            gen['NEXT_PAR_ID'] = None
            gen['NEXT_PAR_CLASS'] = None
            gen.append(f'<p{space1}{ids}{space2}{cls}>' + super_strip(line) + '</p>\n')
    # Are a definition list still open?
    if in_definition_list:
        gen.append('</dl>\n')
    # Are some lists still open?
    if len(list_array) > 0:
        output_list(gen, list_array)
    # Are a table still open?
    if in_table:
        gen.append('</table>\n')
        in_table = False
    # Are we stil in in_pre_block?
    if in_pre_block:
        gen.append('</pre>')
    # Are we still in in_code_block?
    if in_code_block:
        gen.append('</pre>')
    return gen

#-------------------------------------------------------------------------------
# Main functions
#-------------------------------------------------------------------------------

def process_dir(source, dest, default_lang=None, includes=None):
    """Process a directory:
            - If it is a .hml file, it is translated in HTML
            - Else the file is copied into the new directory
       The destination directory is systematically DELETED at each run.
    """
    info(f'Processing directory: {source}')
    if not os.path.isdir(source):
        raise Exception('Process_dir: Invalid source directory: ' + str(source))
    if os.path.isdir(dest):
        shutil.rmtree(dest)
    info(f'Making dir: {dest}')
    os.mkdir(dest)
    for name_ext in os.listdir(source):
        path = os.path.join(source, name_ext)
        if os.path.isfile(path):
            name, ext = os.path.splitext(name_ext)
            if ext == '.hml':
                process_file(path, os.path.join(dest, name + '.html'), default_lang, includes)
            else:
                info(f'Copying file: {path}')
                shutil.copy2(path, os.path.join(dest, name_ext))
        elif os.path.isdir(path):
            process_dir(path, os.path.join(dest, name_ext), default_lang, includes)


def process(source, dest, default_lang=None, includes=None):
    """Process a file or directory"""
    if os.path.isfile(source):
        process_file(source, dest, default_lang, includes)
    elif os.path.isdir(source):
        process_dir(source, dest, default_lang, includes)
    else:
        warning(f'Process: {source} not found.')
