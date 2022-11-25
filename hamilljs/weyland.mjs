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

// This file provides several languages definitions :
//   text
//   bnf
//   hamill
//   game
//   ash
//   json
//   lua
//   python
//   line
//   test

//-------------------------------------------------------------------------------
// Functions
//-------------------------------------------------------------------------------

function ln(s)
{
    return s.replace(/\n/g, '<NL>');
}

//-------------------------------------------------------------------------------
// Class
//-------------------------------------------------------------------------------

class Language
{
    constructor(name, definitions, wrong=[], specials={}, after=null)
    {
        this.name = name;
        if (typeof definitions !== 'object')
        {
            throw new Error("Tokens should be an object of {type: [regex]} and it is a " + typeof definitions);
        }
        this.definitions = definitions;
        for (const [type, variants] of Object.entries(definitions))
        {
            if (variants === null || variants === undefined)
            {
                throw new Error(`No variants for ${type} in language ${name}`);
            }
        }
        // In order to match the entire string we put ^ and $ at the start of each regex
        for (const variants of Object.values(definitions))
        {
            for (let index of Object.keys(variants))
            {
                if (typeof variants[index] !==  "object")
                {
                    let pattern = variants[index];
                    if (pattern[0] !== '^') { pattern = '^' + pattern;}
                    if (pattern[pattern.length-1] !== '$') { pattern += '$'}
                    if (pattern.includes('[\\s\\S]'))
                    {
                        variants[index] = new RegExp(pattern, 'm');
                    } else {
                        variants[index] = new RegExp(pattern);
                    }
                }
            }
        }
        this.specials = specials;
        this.wrong = wrong;
        this.after = after;
    }

    isWrong(type)
    {
        return this.wrong.includes(type);
    }

    getName()
    {
        return this.name;
    }

    getTypeDefinitions()
    {
        return Object.entries(this.definitions);
    }

    getNumberOfTypes()
    {
        return Object.keys(this.definitions).length;
    }

    getNumberOfRegex()
    {
        let sum = 0;
        for (const v of Object.values(this.definitions))
        {
            sum += v.length;
        }
        return sum;
    }

    toString()
    {
        return `Language ${this.getName()} with ${this.getNumberOfTypes()} types and ${this.getNumberOfRegex()} regex`;
    }
}

class Token
{
    constructor(type, value, start)
    {
        if (DEBUG)
        {
            console.log(`Creating {Token} type=${type} value=|${value}| start=${start}`);
        }
        this.type = type;
        this.value = value;
        this.start = start;
    }

    is(value, type=null, start=null)
    {
        let ok_value = (value === null ? true : this.value === value);
        let ok_type  = (type  === null ? true : this.type  === type);
        let ok_start = (start === null ? true : this.start === start);
        return ok_value && ok_type && ok_start;
    }

    getType()
    {
        return this.type;
    }

    getValue()
    {
        return this.value;
    }

    getStart()
    {
        return this.start;
    }

    info()
    {
        return `Token ${this.type.padEnd(20)}  |${(ln(this.value) + '|').padEnd(10)}  #${this.value.length} @${this.getStart()}`;
    }

    toString()
    {
        return `{Token ${this.type}  |${ln(this.value)}|  #${this.value.length} @${this.getStart()}}`;
    }
}

class Match
{
    constructor(type, elem, start)
    {
        if (DEBUG)
        {
            console.log(`Creating {Match} type=${type} elem=${elem} start=${start}`);
        }
        this.type = type;
        this.elem = elem;
        this.start = start;
    }
}

class Lexer
{
    constructor(lang, discards=[])
    {
        if (typeof lang === "string")
        {
            this.lang = LANGUAGES[lang];
        } else if (typeof lang === "object" && lang instanceof Language) {
            this.lang = lang;
        } else {
            throw new Exception(`Lang |${lang}| must be a recognized language or an instance of Language`);
        }
        this.discards = discards;
    }

    getLanguage()
    {
        return this.lang;
    }

    match(start, word)
    {
        let matches = [];
        for (const [type, variants] of this.lang.getTypeDefinitions())
        {
            for (let elem of variants)
            {
                if (DEBUG) console.log(ln(word), 'vs', elem, '=', elem.test(word));
                if (elem.test(word))
                {
                    if (DEBUG) console.log('    Match: ' + type + ' : ' + variants + ' => ' + elem.test(word));
                    matches.push(new Match(type, elem, start));
                }
            }
        }
        return matches;
    }

    lex(text, discards=null)
    {
        discards = discards === null ? this.discards : discards;
        let word = '';
        let old = null;
        let matched = [];
        let tokens = [];
        let start = 0;
        for (let i = 0; i < text.length; i++)
        {
            word += text[i];
            if (DEBUG)
            {
                console.log(start, `${i}. @start |${ln(word)}|`);
            }
            matched = this.match(start, word);
            if (DEBUG && matched.length === 0)
            {
                console.log('    no match this turn');
            }

            if (matched.length === 0 && (old === null || old.length === 0))
            {
                // Nothing, we try to add the maximum
                //throw new Error("Impossible to map the language.");
            } else if (matched.length === 0) { // old !== null && old.length > 0
                // Visions: trying to see if there is something after
                if (i + 1 < text.length)
                {
                    let future_index = i + 1;
                    let future_word = word + text[future_index];
                    matched = this.match(start, future_word);
                    if (DEBUG && matched.length > 0)
                    {
                        console.log('    vision of the future OK');
                    }
                }
                // Si et seulement si dans le futur on n'aura rien on fait un jeton, sinon on continue
                if (matched.length === 0)
                {
                    let content =  word.substring(0, word.length-1);
                    if (DEBUG)
                    {
                        console.log(`pour le mot |${content}| nous avons :`);
                        for (let res of old)
                        {
                            console.log('    ' + res.type + ' : ' + res.elem + ' @' + res.start);
                        }
                    }
                    if (this.lang.isWrong(old[0].type))
                    {
                        throw new Error(`A wrong token definition ${old[0].type} : ${old[0].elem} has been validated by the lexer: ${content}`);
                    }
                    if (!discards.includes(old[0].type))
                    {
                        tokens.push(new Token(old[0].type, content, old[0].start));
                    }
                    word = '';
                    i -= 1;
                    start = old[0].start + content.length;
                }
            }
            old = matched;
        }
        if (old !== null && old.length > 0)
        {
            let content =  word;
            if (DEBUG)
            {
                console.log('pour le mot ' + content + ' nous avons :');
                for (let res of old)
                {
                    console.log('    ' + res.type + ' : ' + res.start);
                }
            }
            if (this.lang.isWrong(old[0].type))
            {
                throw new Error(`A wrong token definition ${old[0].type} : ${old[0].elem} has been validated by the lexer: ${content}`);
            }
            if (!discards.includes(old[0].type))
            {
                tokens.push(new Token(old[0].type, content, old[0].start));
            }
        } else if (word.length > 0)
        {
            console.log(tokens);
            console.log(word.charCodeAt(0));
            throw new Error(`Text not lexed at the end: |${word}| in |${text}| for lang ${this.lang.name}`);
        }
        if (this.lang.after !== null)
        {
            tokens = this.lang.after(tokens);
        }
        return tokens;
    }

    to_html(text=null, tokens=null, raws=[], enumerate=false)
    {
        if (text === null && tokens === null)
        {
            throw new Error("Nothing send to to_html");
        } else if (text !== null && tokens !== null) {
            throw new Error("Send to to_html text OR tokens, not both!");
        }
        if (text !== null)
        {
            tokens = this.lex(text, []) // don't discard anything, we will produce raws instead
        }
        if (DEBUG)
        {
            for (const tok of tokens)
            {
                console.log('    to_html', tok);
            }
        }
        let output = '';
        let nb = 0;
        for (let i = 0; i < tokens.length; i++)
        {
            const tok = tokens[i];
            const next = (i + 1 < tokens.length) ? tokens[i+1] : null;
            if (raws.includes(tok.getType()))
            {
                output += tok.getValue();
            } else {
                let val = tok.getValue();
                val = val.replace('&', '&amp;');
                val = val.replace('>', '&gt;');
                val = val.replace('<', '&lt;');
                output += `<span class="${this.lang.getName()}-${tok.getType()}" title="token n°${nb} : ${tok.getType()}">${val}</span>`;
                if (enumerate)
                {
                    console.log(tok);
                    if (['integer', 'number', 'identifier', 'boolean'].includes(tok.getType()))
                    {
                        if (next != null && ['operator', 'keyword'].includes(next.getType()))
                        {
                            output += ' ';
                        }
                    }
                    else if (['keyword'].includes(tok.getType()))
                    {
                        if (!(['next', 'break', 'return'].includes(tok.getValue())))
                        {
                            output += ' ';
                        }
                    }
                    else if (next != null && ['affectation', 'combined_affectation'].includes(next.getType()))
                    {
                            output = ' '  + output + ' ';
                    }
                    else if (tok.is(',', 'separator'))
                    {
                        output += ' ';
                    }
                    else if (tok.is(null, 'operator'))
                    {
                        output += ' ';
                    }
                    // output += `<sup class='info'>${nb}</sup><span> </span>`;
                }
            }
            nb += 1;
        }
        return output;
    }
}

class Test
{
    constructor(lexer, text, result)
    {
        this.lexer = lexer;
        this.text = text;
        this.result = result;
        if (this.result === null || this.result === undefined)
        {
            throw new Error(`No expected results for test ${text}`);
        }
    }

    test(num=0)
    {
        let tokens = this.lexer.lex(this.text, null);
        if (tokens.length !== this.result.length)
        {
            console.log('ERROR\nText: |' + this.text + '|');
            console.log('Difference of length, dumping:')
            let longuest = Math.max(tokens.length, this.result.length);
            for (let index = 0; index < longuest; index++)
            {
                if (index < tokens.length && index < this.result.length)
                {
                    let cmp = (this.result[index] === tokens[index].getType());
                    console.log(`${index}. ${cmp} Expected=${this.result[index]} vs ${tokens[index].getType()} (${ln(tokens[index].getValue())})`);
                } else if (index < tokens.length) {
                    console.log(`${index}. Expected=null [null] vs ${tokens[index].getType()}`, ln(tokens[index].getValue()));
                } else if (index < this.result.length) {
                    console.log(`${index}. Expected=${this.result[index]} vs null`);
                }
            }
            throw new Error(`Error: expected ${this.result.length} tokens and got ${tokens.length}`);
        }
        for (const [index, r] of this.result.entries())
        {
            if (tokens[index].getType() !== r)
            {
                throw new Error(`Error: expected ${r} and got ${tokens[index].getType()} in ${this.text}`);
            }
        }
        console.log(`[SUCCESS] Test n°${num} Lang : ${this.lexer.getLanguage()}\n    Text : |${ln(this.text)}|\n    Result:`);
        for (const tok of tokens)
        {
            console.log('   ', tok);
        }
        console.log();
    }
}

//-------------------------------------------------------------------------------
// Globals and constants
//-------------------------------------------------------------------------------

// Shared definitions
//var WRONG_INT    = ['[123456789]#*@&*', '0[aAbCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWyYzZ]#*@&*', '00#*@&*'];
//var INTEGER_SEP  = ['#+[#_]*#+'];

const PATTERNS = {
    'IDENTIFIER'    : ['[a-zA-Z]\\w*'],
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
};

const SHORTCUTS = {
    'keyword': 'kw',
    'special': 'spe',
    'identifier': 'id',
    'affectation': 'aff',
    'combined_affectation': 'aff',
    'separator': 'sep',
    'operator': 'op',
    'comment': 'com',

    'boolean': 'bool',
    'integer': 'int',
    'number': 'num',
    'float': 'flt',
    'string': 'str',
}

const LANGUAGES = {
    'ash': new Language('ash',
        {
            'keyword' : ['if', 'then', 'elif', 'else', 'end',
                'while', 'do', 'for',
                'break', 'next', 'return',
                'var', 'fun', 'sub', 'get', 'set', 'class',
                'import', 'from', 'as',
                'try', 'catch', 'finally', 'raise', 'const'],
            'special': ['writeln', 'write'],
            'boolean' : ['false', 'true'],
            'identifier' : PATTERNS["IDENTIFIER"],
            // Old
            'affectation' : ['='],
            'combined_affectation' : ['\\+=', '-=', '\\*=', '/=', '//=', '\\*\\*=', '%='],
            'type' : [':', '->'],
            'fast' : ['=>'],
            'label' : ['::'],
            // 'unary_operator' : ['-', 'not', r'\#', '~'],
            // New
            'integer' : PATTERNS["INTEGER"].concat(PATTERNS["INTEGER_BIN"]).concat(PATTERNS["INTEGER_HEXA"]),
            'number' : PATTERNS["FLOAT"],
            'nil': ['nil'],
            // 'binary_operator' : ['and', 'or', # boolean
            'operator' : ['-', 'not', '#', '~', 'and', 'or', // boolean
                'in', // belongs to
                '\\+', '-', '\\*', '/', '//', '\\*\\*', '%', // mathematical
                '&', '\\|', '~', '>>', '<<', // bitwise
                '<', '<=', '>', '>=', '==', '!=', // comparison
                '\\.'], // call
            'separator': ['\\{', '\\}', '\\(', '\\)', '\\[', '\\]', ',', ';'],
            'wrong_int' : PATTERNS["WRONG_INTEGER"],
            'blank': PATTERNS["BLANKS"],
            'newline' : PATTERNS["NEWLINES"],
            'comment': ['--[^\n]*'],
            'string' : PATTERNS["STRINGS"],
        },
        ['wrong_int'],
        // Special
        {
            'ante_identifier': ['var', 'const', 'function', 'procedure', 'fun', 'pro', 'class', 'module'],
        }
    ),
    'ruby': new Language('ruby',
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
            'integer' : PATTERNS["INTEGER"].concat(PATTERNS["INTEGER_BIN"]).concat(PATTERNS["INTEGER_HEXA"]),
            'number' : PATTERNS["FLOAT"],
            'nil': ['nil'],
            'operator' : ['-', 'not', '#', '~', 'and', 'or', // boolean
                'in', // belongs to
                '\\+', '-', '\\*', '/', '//', '\\*\\*', '%', // mathematical
                '&', '\\|', '~', '>>', '<<', // bitwise
                '<', '<=', '>', '>=', '==', '!=', // comparison
                '\\.'], // call
            'separator': ['\\{', '\\}', '\\(', '\\)', '\\[', '\\]', ',', ';'],
            'wrong_int' : PATTERNS["WRONG_INTEGER"],
            'blank': PATTERNS["BLANKS"],
            'newline' : PATTERNS["NEWLINES"],
            'comment': ['#[^\n]*'],
            'string' : PATTERNS["STRINGS"],
        },
        ['wrong_int'],
        // Special
        {
            'ante_identifier': ['module', 'class', 'def']
        }
    ),
    'bnf': new Language('bnf',
        {
            'keyword': ['<[\\w- ]+>'],  // non-terminal
            'identifier': ['expansion', 'A', 'B', 'C', 'D', 'nom'], // expansion
            'operator': ['::=', '\\|', '\\.\\.\\.', '=', '-', '\\?', '\\*', '\\+', '@', '\\$', '_'],
            'separator': ['\\(', '\\)', '\\[', '\\]', '\\{', '\\}', ',', ';'],
            'string' : ['"[\\w- <>:=,;\\|\']*"', "'[\\w- <>:=,;\\|\"]*'"], // terminal
            'blank': PATTERNS['BLANKS'],
            'comment': ['#[^\n]*\n'],
            'newline' : PATTERNS['NEWLINES'],
        }
    ),
    'bnf-mini': new Language('bnf-mini',
        {
            'keyword': ['<[\\w- ]+>'],   // non-terminal
            'string' : PATTERNS['STRINGS'], // terminal
            'operator': ['::=', '\\|'],    // affect and choice
            'blank': PATTERNS['BLANKS'],
            'newline' : PATTERNS['NEWLINES'],
            'comment': ['\\#.*'],
        }
    ),
    'fr': new Language('fr',
        {
            'word': ['[a-zA-ZéàèùâêîôûëïüÿçœæÉÀÈÙÂÊÎÔÛËÏÜŸÇŒÆ]+'],
            'punct': [',', '\\.', ':', ';', '-', '\\(', '\\)', '!', '\\?', "'", '"'],
            'blank': [' ', '\n', '\t']
        }
    ),
    'game': new Language('game',
        {
            'year': ['\\([12][0-9][0-9][0-9]\\)'],
            'normal': ['\\w[\\w\'\\-:\\d ]*[\\w\\d]'],
            'newline' : ['\n'],
            'separator': [',', ';'],
            'blank': PATTERNS['BLANKS'],
            'wrong_id': ['\\w[\\w\'\\-:\\d ]*[\\w\\d:]'], // Pour garder Far Cry<: >Blood Dragon
            /*
            'number': ['\\d+'],
            'normal': ['\\w[\\w\'-]*'], // Total Annihilation => 2 tokens, Baldur's => 1, Half-life => 1
            'blank': PATTERNS['BLANKS'],
            'wrong_int' : PATTERNS['WRONG_INTEGER'],
            'newline' : ['\n'],
            'operator': [':'] // FarCry:
            */
        },
        ['wrong_id'],
    ),
    'hamill' : new Language('hamill',
        {
            'keyword': ['var', 'const', 'include', 'require', 'css', 'html'],
            'macro': ['\\[=GENDATE\\]'],
            'newline' : PATTERNS["NEWLINES"],
            'paragraph': ['(\n|\n\r|\r\n){2}'],
            'comment': ['//.*(\n|$)'],
            'markup': ['\\{\\{[^\\}]*\\}\\}'],
            'markup_wrong': ['\\{\\{[^\\}]*'],
            'list': ['^([\t ])*(\\* )+'],
            //'link': ['[ \t]*\\[\\[[^\\]]*\\]\\][ \t]*'],
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
            //'table_line': ['\\|[^\n\r]\\|'],
            //'normal': ["([^\\\\*'/\n\r]|\\\\\\*\\*|\\\\\\*|\\\\''|\\\\')+"], //|\\::|\\:)+"],
            'table': ['\\|'],
            'table_header_wrong': ['\\|-+'],
            'normal': ["[^\n\r\\*'\\|\\{\\[:\\^]*"]
        },
        // Nous avons besoin de "sustainers". Des définitions de tokens qui vont permettre d'atteindre le bon token.
        // Sinon https: s'arrêterait au ":" il ferait un <normal, https> puisque https: ne correspond à rien,
        // ni le "futur", càd https:/ Il faut au moins deux / pour embrayer sur la définition url.
        // On a pas ça avec les tokens d'un langage de prog. Ils se contiennent eux-mêmes :
        // i sera valide en id, même s'il fait partir de if plus tard.
        ['table_header_wrong', 'url_wrong', 'label_wrong', 'markup_wrong'],
        // Special
        {
            'ante_identifier': ['var', 'const'],
            'string_markers': [],
        },
        function(tokens)
        {
            let res = [];
            // Première passe, fusion des speciaux / liste
            for (const [index, tok] of tokens.entries())
            {
                if (tok.getType() === 'special' || (tok.getType() === 'list' && index > 0 && !['newline', 'table', 'paragraph'].includes(tokens[index-1].getType())))
                {
                    if (index > 0 && res.length > 0 && res[res.length - 1].getType() === 'normal')
                    {
                        res[res.length - 1].value += tok.getValue();
                    }
                    else if (index + 1 < tokens.length && tokens[index + 1].getType() === 'normal')
                    {
                        tokens[index + 1].value = tok.getValue() + tokens[index + 1].value;
                        tokens[index + 1].start -= tok.getValue().length;
                    }
                } else {
                    res.push(tok);
                }
            }
            // Seconde passe, fusion des normaux
            let res2 = [];
            let index = 0;
            while (index < res.length)
            {
                let tok = res[index];
                if (tok.getType() === 'normal')
                {
                    let futur = index + 1;
                    let merged_value = tok.getValue();
                    while (futur < res.length && res[futur].getType() === 'normal')
                    {
                        merged_value += res[futur].getValue();
                        futur += 1;
                    }
                    tok.value = merged_value;
                    res2.push(tok);
                    index = futur;
                }
                else
                {
                    res2.push(tok);
                    index+=1;
                }
            }
            // Dump #1
            /*for (let [index, tok] of res2.entries())
            {
                console.log('dump #1', index, tok);
            }*/
            // Troisième passe détermination des table avec newline/paragraph
            // et gestion des TableHeader
            let res3 = [];
            index = 0;
            while (index < res2.length)
            {
                let tok = res2[index];
                let next = null;
                if (index + 1 < res2.length)
                {
                    next = res2[index + 1];
                }
                //console.log('>>', index, tok.getType());
                // Start
                if (index === 0 && tok.getType() === 'table')
                {
                    // On ne pousse pas le token courrant, table remplacé par table_line_start
                    res3.push(new Token('table_line_start', '', tok.getStart()));
                }
                // End
                else if (index === res.length - 1 && tok.getType()  === 'table')
                {
                     // On ne pousse pas le token courrant, table remplacé par table_line_end
                     res3.push(new Token('table_line_end', '', tok.getStart()));
                }
                else if (['paragraph', 'newline'].includes(tok.getType()) && next !== null && next.getType() === 'table')
                {
                    if (tok.getType() === 'paragraph')
                    {
                        res3.push(new Token('newline', '\n', tok.getStart())); // we left a newline in order to separate TWO TABLE
                    }
                    res3.push(new Token('table_line_start', '', next.getStart()));
                    index += 1;
                }
                else if (tok.getType() === 'table' && next !== null && ['paragraph', 'newline'].includes(next.getType()))
                {
                    res3.push(new Token('table_line_end', '', next.getStart()));
                    // We left the newline in order to make the table_line_start
                }
                else if (tok.getType() === 'newline' && next !== null && next.getType() === 'table_header_line')
                {
                    let sub = res3.length - 1;
                    let subsub = res3.length - 2;
                    let found = false;
                    while (sub >= 0)
                    {
                        //console.log('----', 'sub', sub, res3[sub], 'subsub', subsub, res3[subsub]);
                        if (res3[sub].getType() === 'table_line_start' && (res3[subsub] === undefined || res3[subsub].getType() !== 'table_line_end'))
                        {
                            found = true;
                            break;
                        }
                        sub -= 1;
                        subsub -= 1;
                    }
                    if (found)
                    {
                        res3[sub].type = 'table_line_header_start';
                    }
                    index += 1;
                }
                else
                {
                    res3.push(tok);
                }
                index += 1;
            }
            return res3;
        }
    ),
    'json': new Language('json',
        {
            'boolean': ['true', 'false'],
            'identifier' : PATTERNS['IDENTIFIER'],
            'number' : PATTERNS['INTEGER'].concat(PATTERNS['FLOAT']),
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
        ['wrong_int'],
        // Special
        {
            'ante_identifier': [],
        }
    ),
    // Un langage qui divise simplement en lignes
    'line': new Language('line',
        {
            'line': ['.*(\n|$)']
        }
    ),
    'lua': new Language('lua',
        {
            'keyword': ['and', 'break', 'do', 'else', 'elseif', 'end', 'for',
                        'function', 'goto', 'if', 'in', 'local', 'not', 'or',
                        'repeat', 'return', 'then', 'until', 'while'],
            'special': ['ipairs', 'pairs', '\\?', 'print'], // ? is here for demonstration only */
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
    'python': new Language('python',
        {
            'keyword' : ['await', 'else', 'import', 'pass', 'break', 'except', 'in',
                     'raise', 'class', 'finally', 'is', 'return', 'and', 'for',
                     'continue', 'lambda', 'try', 'as', 'def', 'from', 'while',
                     'nonlocal', 'assert', 'del', 'global', 'not', 'with', 'if',
                     'async', 'elif', 'or', 'yield'],
            'special': ['print'],
            'identifier' : PATTERNS["IDENTIFIER"],
            'integer' : PATTERNS["INTEGER"].concat(PATTERNS["INTEGER_HEXA"]).concat(PATTERNS["INTEGER_BIN"]),
            'float' : PATTERNS["FLOAT"],
            'boolean' : ['True', 'False'],
            'string' : PATTERNS["STRINGS"],
            'nil': ['None'],
            'operator': ['\\+', '/', '//', '&', '\\^', '~', '\\|', '\\*\\*', '<<', '%', '\\*',
                      '-', '>>', ':', '<', '<=', '==', '!=', '>=', '>', '\\+=',
                      '&=', '/=', '<<=', '%=', '\\*=', '\\|=', '\\*\\*=', '>>=', '-=',
                      '/=', '\\^=', '\\.', '='],
            'separator': ['\\{', '\\}', '\\(', '\\)', '\\[', '\\]', ',', ';'],
            'comment': ['#[^\n]*(\n|$)'],
            'newline' : PATTERNS["NEWLINES"],
            'blank': PATTERNS["BLANKS"],
            'wrong_int' : PATTERNS["WRONG_INTEGER"],
        },
        ['wrong_int'],
        // Special
        {
            'ante_identifier': ['def', 'class'],
        }
    ),
    'test': new Language('test',
        {
            'keyword': ['if', 'then', 'end'],
            'identifier': PATTERNS['IDENTIFIER'],
            'integer': PATTERNS['INTEGER'].concat(PATTERNS['INTEGER_HEXA']),
            'wrong_integer': PATTERNS['WRONG_INTEGER'],
            'float': PATTERNS['FLOAT'],
            //'wrong_float': WRONG_FLOAT,
            'blank': PATTERNS['BLANKS'],
            'newline': PATTERNS['NEWLINES'],
            'operators': PATTERNS['OPERATORS'],
            'separators': PATTERNS['SEPARATORS'],
            'strings': PATTERNS['STRINGS']
        },
        ['wrong_integer']), //, 'wrong_float']);
    'text': new Language('text', {
        'normal': ['[^ \\t]*'],
        'blank': PATTERNS['BLANKS'],
        'newline': PATTERNS['NEWLINES'],
        }),
}

const LEXERS = {
    'ash': new Lexer(LANGUAGES['ash'], ['blank']),
    'bnf': new Lexer(LANGUAGES['bnf'], ['blank']),
    'bnf-mini': new Lexer(LANGUAGES['bnf-mini'], ['blank']),
    'fr': new Lexer(LANGUAGES['fr'], ['blank']),
    'game': new Lexer(LANGUAGES['game'], ['blank', 'newline']),
    'hamill': new Lexer(LANGUAGES['hamill'], ['blank']),
    'json': new Lexer(LANGUAGES['json'], ['blank', 'newline']),
    'line': new Lexer(LANGUAGES['line']),
    'lua': new Lexer(LANGUAGES['lua'], ['blank']),
    'python': new Lexer(LANGUAGES['python']),
    'ruby': new Lexer(LANGUAGES['ruby']),
    'text': new Lexer(LANGUAGES['text'], ['blank'])
}

const TESTS = [
    new Test(LEXERS['line'], "bonjour\ntoi qui\nvient de loin", ['line', 'line', 'line']),
    new Test(LEXERS['fr'], "bonjour l'ami !", ['word', 'word', 'punct', 'word', 'punct']),
    new Test(LEXERS['text'], "je suis là", ['normal', 'normal', 'normal']),
    new Test(LEXERS['game'], "Baldur's Gate\nTotal Annihilation\nHalf-Life\nFar Cry: Blood Dragon\nSystem Shock 2\n WarCraft 2 (1995)",
             ['normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'year']),
    new Test(LEXERS['json'], "{'alpharius': 20, 'heretic': true}",
             ['separator', 'string', 'separator', 'number', 'separator', 'string', 'separator', 'boolean', 'separator']),
    new Test(LEXERS['bnf'], "<rule 1> ::= 'terminal1' 'terminal2'",
             ['keyword', 'operator', 'string', 'string']),
    new Test(LEXERS['bnf-mini'], "<rule xtrem> ::= 'terminal xtrem'", ['keyword', 'operator', 'string']),
    new Test(LEXERS['python'], "def a():\n\tif a == 5:\n\t\tprint('hello')",
             ['keyword', 'blank', 'identifier', 'separator', 'separator', 'operator', 'newline',
              'blank', 'keyword', 'blank', 'identifier', 'blank', 'operator', 'blank', 'integer', 'operator', 'newline',
              'blank', 'special', 'separator', 'string', 'separator']),

    new Test(LEXERS['lua'], '3+5', ['number', 'operator', 'number']),
    new Test(LEXERS['lua'], 'a = 5', ['identifier', 'operator', 'number']),
    new Test(LEXERS['lua'], 't = { ["k1"] = 5 }', ['identifier', 'operator', 'separator', 'separator', 'string', 'separator', 'operator', 'number', 'separator']),
    new Test(LEXERS['lua'], 't = { ["k1"] = 5, ["k2"] = "v", [4] = 6 } -- Définition\nprint(t["k1"]) -- Accès\nprint(t.k1) -- Accès avec sucre syntaxique',
            ['identifier', 'operator', 'separator', 'separator', 'string', 'separator', 'operator', 'number', 'separator',
             'separator', 'string', 'separator', 'operator', 'string', 'separator', 'separator', 'number', 'separator', 'operator', 'number',
             'separator', 'comment', 'special', 'separator', 'identifier', 'separator', 'string', 'separator', 'separator', 'comment',
             'special', 'separator', 'identifier', 'operator', 'identifier', 'separator', 'comment']),
    new Test(LEXERS['lua'], '--[[Ceci est un\nz--]]', ['comment']),
    new Test(LEXERS['lua'], '--[[Ceci est un\ncommentaire multiligne--]]', ['comment']),

    new Test(LEXERS['ash'], "a ** 5", ['identifier', 'operator', 'integer']),
    new Test(LEXERS['ash'], 'writeln("hello")', ['special', 'separator', 'string', 'separator']),
    new Test(LEXERS['ash'], 'if a == 5 then\n    writeln("hello")\nend',
                ['keyword', 'identifier', 'operator', 'integer', 'keyword', 'newline',
                 'special', 'separator', 'string', 'separator', 'newline',
                 'keyword']),

    new Test(LEXERS['hamill'], "// ceci est un commentaire\n// ceci est un autre", ['comment', 'comment']),
    new Test(LEXERS['hamill'], "**bold * \\** text**", ['bold', 'normal', 'bold']),
    new Test(LEXERS['hamill'], "**bold ''text''**", ['bold', 'normal', 'italic', 'normal', 'italic', 'bold']),
    new Test(LEXERS['hamill'], "* * * **ceci est une liste en gras**", ['list', 'bold', 'normal', 'bold']),
    new Test(LEXERS['hamill'], "|-----------------------|", ['table_header_line']),
    new Test(LEXERS['hamill'], "::label:: https://value", ['label', 'url']),
    new Test(LEXERS['hamill'], "::label:: http://value\ntext", ['label', 'url', 'newline', 'normal']),
    new Test(LEXERS['hamill'], "|une table avec du **gras**|", ['table_line_start', 'normal', 'bold', 'normal', 'bold', 'table_line_end']),
    new Test(LEXERS['hamill'], '|| * une continuation de table avec une liste|', ['table_line_start', 'table', 'list', 'normal', 'table_line_end']),
    new Test(LEXERS['hamill'], '{{pipo}}Damien Gouteux', ['markup', 'normal']),
    new Test(LEXERS['hamill'], '|ligne 1, col 1|ligne 1, col2|\n|ligne 2, col 1|ligne 2, col2|', ['table_line_start', 'normal', 'table', 'normal', 'table_line_end', 'table_line_start', 'normal', 'table', 'normal', 'table_line_end']),
    new Test(LEXERS['hamill'], '[[bonjour]] le monde', ['link', 'normal']),
]

function tests(stop_at=null, only=false)
{
    for (const [index, t] of TESTS.entries())
    {
        if (stop_at === null || only === false || index + 1 === stop_at)
        {
            t.test(index + 1);
        }
        if (stop_at !== null && index + 1 === stop_at)
        {
            break;
        }
    }

    console.log("\n------------------------------------------------------------------------");
    console.log("Test de to_html");
    console.log("------------------------------------------------------------------------\n");

    console.log(LEXERS['lua'].to_html("if a >= 5 then println('hello') end", null, ['blank']));
}

const DEBUG = false;
//tests(); // 4 pour arrêter au test 4. true pour ne faire QUE le test 4.

export {ln, Language, Token, Lexer, LANGUAGES, PATTERNS, LEXERS};