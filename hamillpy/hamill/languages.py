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

class Language:
    
    def __init__(self, name, definitions, wrong=None, specials=None):
        wrong = [] if wrong is None else wrong
        specials = {} if specials is None else specials
        self.name = name
        if type(definitions) != dict:
            raise Exception("Tokens should be an object of {type: [regex]} and it is a " + type(definitions))
        self.definitions = definitions
        for typ, variants in definitions.items():
            if variants is None:
                raise Exception(f"No variants for {typ} in language {name}")
        # In order to match the entire string we put ^ and $ at the start of each regex
        for variants in definitions.values():
            for index, pattern in enumerate(variants):
                if type(pattern) != re.Pattern:
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
    'IDENTIFIER'    : ['[a-zA-Z]\\w*'],
    'INTEGER'       : ['\\d+'],
    'WRONG_INTEGER' : ['\\d+\\w+'],
    'BLANKS'        : ['[ \\t]+'],
    'NEWLINES'      : ['\n', '\n\r', '\r\n'],
    'STRINGS'       : ["'([^\\\\]|\\\\['nt])*'", '"([^\\\\]|\\\\["nt])*"'],
}

LANGUAGES = {
    'ash': Language('ash',
        {
            'keyword'   : [ 'if', 'then', 'else', 'end', 'elif'],
            'boolean'   : ['true', 'false'],
            'nil'       : ['nil'],
            'identifier': PATTERNS['IDENTIFIER'],
            'number'    : ['\\d+', '\\d+\\.\\d+'],
            'string'    : PATTERNS['STRINGS'],
            'operator'  : ['\\+', '\\*', '-', '/', '%', '\\^',
                           '\\.\\.',
                           '=', '\\+=', '\\*=', '-=', '/=', '%=', '\\='],
            'separator' : ['\\(', '\\)', ','],
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
            'number': ['\\d+'],
            'normal': ['\\w[\\w\'-]*'], # Total Annihilation => 2 tokens, Baldur's => 1, Half-life => 1
            'blank': PATTERNS['BLANKS'],
            'wrong_int' : PATTERNS['WRONG_INTEGER'],
            'newline' : ['\n'],
            'operator': [':'] # FarCry:
        }
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
            'normal': ['[^\\t\\n]*'],
            'blank': PATTERNS['BLANKS'],
            'newline': PATTERNS['NEWLINES'],
        }
    ),
    'hamill' : Language('hamill',
        {
            'keyword': ['var', 'const', 'include', 'require', 'css', 'html'],
            'boolean': ['true', 'false'],
            'identifier' : PATTERNS['IDENTIFIER'],
            'integer' : ['\\d+'],
            'boolean' : ['true', 'false'],
            'nil': [],
            'operator': [':'],
            'separator' : ['{', '}', '\#', '.'],
            'wrong_int' : WRONG_INT,
            'blank': PATTERNS['BLANKS'],
            'newline' : PATTERNS['NEWLINES'],
            'line_comment': ['§§'],
        },
    )
}

RECOGNIZED_LANGUAGES = LANGUAGES.keys()
