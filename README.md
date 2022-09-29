# Hamill

A simple lightweight markup language outputting HTML. Implementations are available in JavaScript and Python 3.

<ins>Rationale</ins>: More complete than [the original Markdown](https://daringfireball.net/projects/markdown/syntax)<sup>2004</sup>, easier to parse and write.

First version released in 2020. Version 2 released in 2022.

You can try it live [here](https://xitog.github.io/dgx/informatique/hamilljs/hamill_live.html).

<p align="right">
Damien Gouteux 2020-2022
</p>

## <a name="summary"></a> Summary

* [Comments, HR and BR](#comments)
* [Titles](#titles)
* [Text modifications](#text)
* [Div, p and span](#div) 
* [Code](#code)
* [Quotes](#quotes)
* [Lists](#lists) 
* [Definition lists](#definitions)
* [Tables](#tables)
* [Links](#links)
* [Images](#images)
* [Constants](#constants)
* [Variables](#variables)
* [Inclusion of HTML files]("#include")
* [Links to CSS and JavaScript files](#require) 
* [Raw HTML and CSS](#direct)

## <a name="comments"> Comments, HR and BR

``// This is a comment``

Comment can be exported in the resulting document by setting the variable ``EXPORT_COMMENT`` to true.

You can put a new line (br) with `` !! `` surrounded by one space on each side.

You can put a line (hr) with a line with only three or more ``-`` on it :``---``.

<p align="center">
 <a href="#summary">Back to summary</a>
</p>
 
## <a name="titles"> Titles

Start your title lines with the number of ``#`` equivalent to the title level:
 
 ``### This is a level 3 title``

Any spaces between the suite of ``#`` and the first non empty character will be discarded. 

  ``##Title`` is equivalent to ``## Title``

<p align="center">
 <a href="#summary">Back to summary</a>
</p>

## <a name="text"> Text modifications

The style of the text can be modified by the following markups:

* Surround your text with ``**`` for bold **abc**
* Surround your text with ``''`` for italic _abc_
* Surround your text with ``--`` for strikethrough ~~abc~~
* Surround your text with ``__`` for underline <ins>abc</ins>
* Surround your text with ``^^`` for superscript Ex<sup>abc</sup>
* Surround your text with ``%%`` for subscript Ex<sub>abc</sub>
* Surround your text with ``@@`` for code (see below) ``abc``. No markup is interpreted inside code.
* Use ``\`` to prevent the interpretation of a markup

<p align="center">
 <a href="#summary">Back to summary</a>
</p>

## <a name="div"> Div, p and span

You can define custom div, span and paragraph with:

* Write ``{{#id .class}}`` alone on a line to define a div  with the given id and/or class.
* Write ``{{begin}}`` to open a div without a class or an id.
* Write ``{{end}}`` to close a div.
* Write ``{{#id .class}} content`` on a line with text to define a paragraph with the given id and/or class until the next empty line.
* Write ``{{#id .class content}}`` in a text to define a span with the given id and/or class.

<p align="center">
 <a href="#summary">Back to summary</a>
</p>

## <a name="code"> Code

* Surround your code with ``@@`` in a text for inline code. Hamill can colorize the code using [Weyland](https://github.com/Xitog/weyland).
* Specify the language right after the opening ``@@`` with an space at the end: ``@@python @@`` ``\`` to escape.
* For a code block, you can either do :
  * a opening line with only ``@@language`` then each line of code must start by ``@@``
  * a opening line with only ``@@@language`` then each line can start freely but you must close the block by a line with only ``@@@`` on it

The blocks

```
@@python
@@ def hello(n):
@@     print(f"Hello {n}!")
@@
```

and

```
@@@python
def hello(n):
    print(f"Hello {n}!")
@@@
```

produce:

```python
def hello(n):
    print(f"Hello {n}!")
```

## <a name="quotes"> Quotes

* With ``>>`` at the start of the line and all the following lines of the quote
* With ``>>>`` at the start of the first line, then each line can start freely but you must close the block by a line with only ``>>>`` on it

The blocks

```
>> I have spread my dreams under your feet;
>> Tread softly because you tread on my dreams.
>> He wishes for the Cloths of Heaven by WB Yeats
```

or

```
>>> I have spread my dreams under your feet;
Tread softly because you tread on my dreams.
He wishes for the Cloths of Heaven by WB Yeats
>>>
```

produce:

> I have spread my dreams under your feet;  
> Tread softly because you tread on my dreams.  
> He wishes for the Cloths of Heaven by WB Yeats  

<p align="center">
 <a href="#summary">Back to summary</a>
</p>

## <a name="lists"> Lists

* Use ``*`` at a start of line followed by a space for an unordered list
* Use ``+`` at a start of line followed by a space for an ordered list, ascending
* Use ``-`` at a start of line followed by a space  for an ordered list, descending
* You can have multiple level of lists by putting two spaces before the starter symbol for each level
* Use ``|`` for continuing a previous item on a new line

<p align="center">
 <a href="#summary">Back to summary</a>
</p>

## <a name="definitions"> Definition lists

* Use ``$`` at a start of line followed by a space for the definition term
* The following line of text will be the definition

<p align="center">
 <a href="#summary">Back to summary</a>
</p>

## <a name="tables"> Tables

* Use ``|`` to limit your table and its columns
* For creating a header line, put after the title line a ``|-------|`` line 
* The header line can have any number of ``|`` inside
* Text modifiers, images and links can be put inside a table
* If the character right after the starting ``|`` of a cell is ``=`` its content will be centered
* **LIMITATION**: lists can't be put in a table

<p align="center">
 <a href="#summary">Back to summary</a>
</p>

## <a name="links"> Links

* Use surrounding ``[[ url ]]`` for a simple URL link
* Use ``[[ display -> link ]]`` for a link with a display string different of the link itself
* If link is equal to ``#``, Hamill will search if it can find a corresponding inner links and put it here
* Inner links are created by the syntax ``[[#...]] ``and automatically for title (space are replaced by - and text put in lowercase)
* If link is not an URL, nor ``#``, Hamill will search if it can find in the library of links
* An item of the library of links is defined by putting at the start of line ``::label:: URL``

<p align="center">
 <a href="#summary">Back to summary</a>
</p>

## <a name="images"> Images

* Use ``(( url ))``
* You can specify a caption before `` (( caption -> url ))``
* You can also specify an id or a class before ``(( .id #class -> url ))``
* You can define a default directory where to find the images with the variable ``DEFAULT_FIND_IMAGE``

<p align="center">
 <a href="#summary">Back to summary</a>
</p>

## <a name="constants"> Constants

* You can define the value of the one of the 6 constants by starting a line with ``!const`` then the constant identifier then = and the value
* You can only set the value of a constant once, anywhere in the document.
* The 6 constants are :
  * ``TITLE`` to define the title of the page
  * ``ICON`` to define an icon for the page
  * ``LANG`` to define the lang of the page (default : en)
  * ``ENCODING`` to define the encoding of the page (default : utf-8)
  * ``BODY_CLASS`` to define the class of the body
  * ``BODY_ID`` to define the ID of the body
* You can display the value of a constant by using ``$$TITLE$$``

<p align="center">
 <a href="#summary">Back to summary</a>
</p>

## <a name="variables"> Variables

* You can define the value of the variables by staring a line with ``!var`` then the variable identifier then = and the value
* A variable value can change through the process of emitting HTML
   * ``EXPORT_COMMENT=true/false`` specify if entire comment lines must be emitted in HTML
   * ``PARAGRAPH_DEFINITION=true/false`` specify if definitions of a definition list must be put in paragraph (p)
   * ``DEFAULT_CODE=python/json`` define the language of the code by default (plain text by default)
   * ``NEXT_PAR_ID=ids`` specify the ID of the next paragraph
   * ``NEXT_PAR_CLASS=cls`` specify the class of the next paragraph
   * ``DEFAULT_PAR_CLASS=cls`` specify the default class of the paragraphes
   * ``DEFAULT_FIND_IMAGE=path`` specifiy a default directory where to find the included images
* You can display the value of a variable by using ``$$NEXT_PAR_ID$$``

<p align="center">
 <a href="#summary">Back to summary</a>
</p>

## <a name="include"> Inclusion of HTML files

* Start a line with ``!include`` for emitting the content of an HTML file directly into your production

<p align="center">
 <a href="#summary">Back to summary</a>
</p>

## <a name="require"> Links to CSS and JavaScript files

* Start a line with ``!require`` for linking your production to a given CSS or JavaScript file
* The CSS link or the JavaScript link will be put in the head of the HTML page

<p align="center">
 <a href="#summary">Back to summary</a>
</p>

## <a name="direct">Raw HTML and CSS

Raw CSS and HTML are always possible :

* Start a line with ``!css`` for emitting raw CSS code which will be put in the head
* Start a line with ``!html`` for emitting raw HTML code in place

<p align="center">
 <a href="#summary">Back to summary</a>
</p>
