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

"""Weyland: provides an alternative way to write regular expression (regex) and a lexer using them."""

# Version of the weyland package
__version__ = "0.2.7"

# Imports
import logging
from weyland.lexer import *
from weyland.languages import RECOGNIZED_LANGUAGES, LANGUAGES, PATTERNS, Language

logging.basicConfig(format='%(levelname)s %(asctime)s %(message)s')
logging.getLogger().setLevel(logging.DEBUG)

LEXERS = {
    'ash': Lexer(LANGUAGES['ash'], ['blank']),
    'bnf': Lexer(LANGUAGES['bnf'], ['blank']),
    #'bnf-mini': Lexer(LANGUAGES['bnf-mini'], ['blank']),
    #'fr': Lexer(LANGUAGES['fr'], ['blank']),
    'game': Lexer(LANGUAGES['game'], ['blank', 'newline']),
    'hamill': Lexer(LANGUAGES['hamill'], ['blank']),
    'json': Lexer(LANGUAGES['json'], ['blank', 'newline']),
    #'line': Lexer(LANGUAGES['line']),
    'lua': Lexer(LANGUAGES['lua'], ['blank']),
    'python': Lexer(LANGUAGES['python']),
    'ruby': Lexer(LANGUAGES['ruby']),
    'text': Lexer(LANGUAGES['text'], ['blank']),
}
