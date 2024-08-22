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

"""This file provides languages definition"""

#-------------------------------------------------------------------------------
# Import
#-------------------------------------------------------------------------------

import re

#-------------------------------------------------------------------------------
# Class
#-------------------------------------------------------------------------------

class LanguageException(Exception):
    pass

class Language:

    def __init__(self, name, definitions, wrong=None, specials=None):
        wrong = [] if wrong is None else wrong
        specials = {} if specials is None else specials
        self.name = name
        if not isinstance(definitions, dict):
            raise LanguageException("Tokens should be an object of {type: [regex]} and it is a " + type(definitions))
        self.definitions = definitions
        for typ, variants in definitions.items():
            if variants is None:
                raise LanguageException(f"No variants for {typ} in language {name}")
        # In order to match the entire string we put ^ and $ at the start of each regex
        for variants in definitions.values():
            for index, pattern in enumerate(variants):
                if not isinstance(pattern, re.Pattern):
                    if pattern[0] != '^':
                        pattern = '^' + pattern
                    if pattern[-1] != '$':
                        pattern += '$'
                    if '[\\s\\S]' in pattern:
                        variants[index] = re.compile(pattern, re.M)
                    else:
                        variants[index] = re.compile(pattern)
        self.specials = specials
        self.wrong = wrong

    def is_wrong(self, typ):
        return typ in self.wrong

    def get_name(self):
        return self.name

    def get_type_definitions(self):
        return self.definitions.items()

    def get_number_of_types(self):
        return len(self.definitions)

    def get_number_of_regex(self):
        total = 0
        for k, v in enumerate(self.definitions):
            total += len(v)
        return total

    def __str__(self):
        return f"Language {self.get_name()} with {self.get_number_of_types()} types and {self.get_number_of_regex()} regex"

#-------------------------------------------------------------------------------
# Globals and constants
#-------------------------------------------------------------------------------

# Shared definitions
IDENTIFIER   = ['[@_]&*']
WRONG_INT    = ['[123456789]#*@&*', '0[aAbCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWyYzZ]#*@&*', '00#*@&*']
INTEGER      = ['#+']
INTEGER_HEXA = ['0[xX][#ABCDEFabcdef]+']
INTEGER_SEP  = ['#+[#_]*#+']
INTEGER_BIN  = ['0[bB][01]+']
FLOAT        = ['#+\.#+', '#+[eE]-?#+', '#+\.#+[eE]-?#+']
STRING       = ['"[^"]*"', "'[^']*'"] # pb : can't escape \" and \'

# Languages
#   text
#   bnf
#   hamill
#   game
#   ash, json, lua, python

PATTERNS = {
    'IDENTIFIER'    : ['[_a-zA-Z]\\w*'],
    'INTEGER'       : ['\\d+'],
    'INTEGER_HEXA'  : ['0[xX][\\dABCDEFabcdef]+'],
    'INTEGER_BIN'   : ['0[bB][01]+'],
    'WRONG_INTEGER' : ['\\d+\\w+'],
    'FLOAT'         : ['\\d+\\.\\d+', '\\d+[eE]-\\d+', '\\d+\\.\\d+[eE]-?\\d+'],
    'WRONG_FLOAT'   : ['\\d+\\.'],
    'BLANKS'        : ['[ \u00A0\\t]+'],
    'NEWLINES'      : ['\n', '\n\r', '\r\n'],
    'OPERATORS'     : ['==', '=', '\\.'],
    'STRINGS'       : ["'([^\\\\']|\\\\['nt])*'", '"([^\\\\"]|\\\\["nt])*"'],
    'SEPARATORS'    : ['\\(', '\\)']
}

LANGUAGES = {
    'ash': Language('ash',
        {
            'keyword'   : [ 'var', 'const', 'if', 'then', 'elsif', 'else', 'end', 'while', 'do', 'for', 'loop', 'in', 'break', 'next', 'fun', 'pro', 'return', 'get', 'set', 'and', 'or', 'not', 'class', 'static', 'is', 'import'],
            'special': ['writeln', 'write'],
            'boolean'   : ['true', 'false'],
            'nil'       : ['nil'],
            'identifier': ['[@$]?[a-zA-Z]\\w*'],
            'number'    : ['\\d+', '\\d+\\.\\d+'],
            'string'    : PATTERNS['STRINGS'],
            'operator'  : ['\\.\\.',
                           '\\+', '-', '\\*', '\\*\\*', '/', '//', '%',
                           '&', '\\|', '~', '<<', '>>',
                           '<', '<=', '>=', '>', '==', '!=',
                           '\\.',
                           '=', '\\+=', '-=', '\\*=', '\\*\\*=', '/=', '//=', '%=',
                           '=>', '#', '\\$'],
            'separator' : ['\\{', '\\}', '\\(', '\\)', '\\[', '\\]', ',', ';', ':'],
            'comment'   : ['--(?!\\[\\[).*(\n|$)'],
            'newline'   : PATTERNS['NEWLINES'],
            'blank'     : PATTERNS['BLANKS'],
            'wrong_int' : PATTERNS['WRONG_INTEGER'],
        },
        ['wrong_integer'],
        {
            'ante_identifier': ['function'],
        }
    ),
    'game': Language('game',
        {
            'year': ['[12][0-9][0-9][0-9]'],
            'normal': ['\\w[\\w\'\\-:\\d ’]*[\\w\\d]'],
            'newline' : ['\n'],
            'separator': [',', ';'],
            'blank': PATTERNS['BLANKS'],
            'wrong_id': ['\\w[\\w\'\\-:\\d ]*[\\w\\d:]'], # Pour garder Far Cry<: >Blood Dragon
        },
        ['wrong_id']
    ),
    'lua': Language('lua',
        {
            'keyword': ['and', 'break', 'do', 'else', 'elseif', 'end', 'for',
                        'function', 'goto', 'if', 'in', 'local', 'not', 'or',
                        'repeat', 'return', 'then', 'until', 'while'],
            'special': ['ipairs', 'pairs', '\\?', 'print'], # ? is here for demonstration only */
            'boolean': ['true', 'false'],
            'nil' : ['nil'],
            'identifier' : PATTERNS['IDENTIFIER'],
            'number' : ['\\d+', '\\d+\\.\\d+'],
            'string' : PATTERNS['STRINGS'],
            'operator': ['==', '~=', '<', '<=', '>', '>=',
                         '=',
                         '\\+', '\\*', '-', '/', '%', '\\^',
                         '&', '\\|', '~', '>>', '<<',
                         '\\.', '\\.\\.',
                         '#', ':'],
            'separator': ['\\{', '\\}', '\\(', '\\)', '\\[', '\\]', ',', ';'],
            'comment': ['--(?!\\[\\[).*(\n|$)', '--\\[\\[[\\s\\S]*--\\]\\](\n|$)'],
            'intermediate_comment': ['--\\[\\[[\\s\\S]*'],
            'newline' : PATTERNS['NEWLINES'],
            'blank': PATTERNS['BLANKS'],
            'wrong_int' : PATTERNS['WRONG_INTEGER'],
        },
        ['wrong_integer'],
        {
            'ante_identifier': ['function'],
        }
    ),
    'python': Language('python',
        {
            'keyword' : ['await', 'else', 'import', 'pass', 'break', 'except', 'in',
                     'raise', 'class', 'finally', 'is', 'return', 'and', 'for',
                     'continue', 'lambda', 'try', 'as', 'def', 'from', 'while',
                     'nonlocal', 'assert', 'del', 'global', 'not', 'with', 'if',
                     'async', 'elif', 'or', 'yield'],
            'operator': ['\\+', '/', '//', '&', '\\^', '~', '\\|', '\\*\\*', '<<', '%', '\\*',
                      '-', '>>', ':', '<', '<=', '==', '!=', '>=', '>', '\\+=',
                      '&=', '/=', '<<=', '%=', '\\*=', '\\|=', '\\*\\*=', '>>=', '-=',
                      '/=', '\\^=', '\\.', '='],
            'separator': ['\\{', '\\}', '\\(', '\\)', '\\[', '\\]', ',', ';'],
            'comment': ['#.*(\n|$)'],
            'boolean': ['True', 'False'],
            'nil' : ['None'],
            'identifier' : PATTERNS['IDENTIFIER'],
            'float' : ['\\d+\\.\\d+'],
            'integer': ['\\d+'],
            'string' : PATTERNS['STRINGS'],
            'newline' : PATTERNS["NEWLINES"],
            'blank': PATTERNS["BLANKS"],
            'wrong_int' : PATTERNS["WRONG_INTEGER"],
        }
    ),
    'text': Language('text',
        {
            'normal': ['[^ \\t\\n]*'],
            'blank': PATTERNS['BLANKS'],
            'newline': PATTERNS['NEWLINES'],
        }
    ),
    'hamill' : Language('hamill',
        {
            'keyword': ['var', 'const', 'include', 'require', 'css', 'html'],
            'macro': ['\\[=GENDATE\\]'],
            'newline' : PATTERNS["NEWLINES"],
            'paragraph': ['(\n|\n\r|\r\n){2}'],
            'comment': ['$$.*(\n|$)', '!rem.*(\n|$)'],
            'markup': ['\\{\\{[^\\}]*\\}\\}'],
            'markup_wrong': ['\\{\\{[^\\}]*'],
            'list': ['^([\t ])*(\\* )+'],
            'link': ['\\[\\[[^\\]]*\\]\\]*'],
            'bold': ['\\*\\*'],
            'special': ['\\\\\\*\\*', '\\*',"'", '\\^', ':', '\\{', '\\}'],
            'italic': ["''"],
            'sup': ["\\^\\^"],
            'title': ['#+[^\n\r]*'],
            'hr': ['---[\n\r]'],
            'const': ['!const [^\n\r]*'],
            'var': ['!var [^\n\r]*'],
            'require': ['!require [^\n\r]*'],
            'include': ['!include [^\n\r]*'],
            'css': ['!css [^\n\r]*'],
            'html': ['!html [^\n\r]*'],
            'label': ['::[^:\n\r]*::[ \t]*'],
            'label_wrong': ['::[^:\n\r]*'],
            'url': ['(https://|http://)[\\w\\./#]*'],
            'url_wrong': ['(https:|http:)'],
            'table_header_line': ['\\|-+\\|'],
            'table': ['\\|'],
            'table_header_wrong': ['\\|-+'],
            'normal': ["[^\n\r\\*'\\|\\{\\[:\\^]*"],
            'other': ['\\[', '\\]']
        },
    ),
    'ruby': Language('ruby',
        {
            'keyword': [
                '__ENCODING__', '__LINE__', '__FILE__',
                'BEGIN', 'END',
                'alias', 'begin', 'break', 'case', 'class',
                'def', 'defined?', 'do', 'else', 'elsif', 'end', 'ensure',
                'for', 'if', 'in', 'module', 'next', 'nil',
                'redo', 'rescue', 'retry', 'return', 'self', 'super',
                'then', 'undef', 'unless', 'until', 'when', 'while', 'yield'
            ],
            'special': ['writeln', 'write'],
            'boolean' : ['false', 'true'],
            'identifier' : ['[a-zA-Z]\\w*[\\?\\!]?'],
            'affectation' : ['='],
            'combined_affectation' : ['\\+=', '-=', '\\*=', '/=', '//=', '\\*\\*=', '%='],
            'integer' : PATTERNS["INTEGER"] + PATTERNS["INTEGER_BIN"] + PATTERNS["INTEGER_HEXA"],
            'number' : PATTERNS["FLOAT"],
            'nil': ['nil'],
            'operator' : ['-', 'not', '#', '~', 'and', 'or', # boolean
                'in', # belongs to
                '\\+', '-', '\\*', '/', '//', '\\*\\*', '%', # mathematical
                '&', '\\|', '~', '>>', '<<', # bitwise
                '<', '<=', '>', '>=', '==', '!=', # comparison
                '\\.'], # call
            'separator': ['\\{', '\\}', '\\(', '\\)', '\\[', '\\]', ',', ';'],
            'wrong_int' : PATTERNS["WRONG_INTEGER"],
            'blank': PATTERNS["BLANKS"],
            'newline' : PATTERNS["NEWLINES"],
            'comment': ['#[^\n]*'],
            'string' : PATTERNS["STRINGS"],
        },
        ['wrong_int'],
        # Special
        {
            'ante_identifier': ['module', 'class', 'def']
        }
    ),
    'bnf': Language('bnf',
        {
            'keyword': ['<[\\w\\-è ]+>'], # non-terminal
            'identifier': ['expansion', 'A', 'B', 'C', 'D', 'nom'], # expansion
            'operator': ['::=', '\\|', '\\.\\.\\.', '=', '-', '\\?', '\\*', '\\+', '@', '\\$', '_'],
            'separator': ['\\(', '\\)', '\\[', '\\]', '\\{', '\\}', ',', ';'],
            'string' : ['"[\\w\\- <>:=,;\\|\']*"', "'[\\w\\- <>:=,;\\|\"]*'"], # terminal
            'blank': PATTERNS['BLANKS'],
            'comment': ['#[^\n]*\n'],
            'newline' : PATTERNS['NEWLINES'],
        }
    ),
    'json': Language('json',
        {
            'boolean': ['true', 'false'],
            'identifier' : PATTERNS['IDENTIFIER'],
            'number' : PATTERNS['INTEGER'] + PATTERNS['FLOAT'],
            'string' : PATTERNS['STRINGS'],
            'nil': [],
            'keyword': ['null'],
            'operator': [],
            'separator': ['\\{', '\\}', '\\(', '\\)', '\\[', '\\]', ',', ':', "\\."],
            'comment' : [],
            'newline' : PATTERNS['NEWLINES'],
            'blank': PATTERNS['BLANKS'],
            'wrong_int' : PATTERNS['WRONG_INTEGER'],
        },
        ['wrong_int']
    ),
}

RECOGNIZED_LANGUAGES = LANGUAGES.keys()
