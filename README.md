# Hamill

A simple lightweight markup language. Its default implementation is written in Python 3.

## Comments, HR and BR

``§§ This is a comment``

Comment can be exported with the variable ``EXPORT_COMMENT`` set to true.

You can put a new line (br) with `` !! `` surrounded by one space on each side.

You can put a line (hr) with a line with only three or more - on it :``---``.

## Titles

Start your titles with the number of ``#`` equivalent to the title level.

## Text modifications

* Surround your word with ``**`` for bold
* Surround your word with ``''`` for italic
* Surround your word with ``--`` for strikethrough
* Surround your word with ``__`` for underline
* Surround your word with ``^^`` for superscript

## Div, p and span

* Use ``{{#id .class}}`` alone on a line to define a div  with the given id and/or class. Use {{end}} to close it.
* Use ``{{#id .class}}`` on a line with text to define a paragraph with the given id and/or class.
* Use ``{{#id .class content}}`` in a text to define a span with the given id and/or class.

## Code

* Surround your code with ``@@`` in a text for inlince code. Hamill can colorize Python and JSON.
* Specify the language right after the opening ``@@``.
* For a code bloc, you can either do :
  * a opening line with ``@@language`` then each line must start by ``@@`` (without closing)
  * a opening line with ``@@@language`` then each line can start freely but you must close the bloc by a line with only @@@ on it

## List

* Use ``*`` at a start of line followed by a space for an unordered list
* Use ``%`` or ``+`` at a start of line followed by a space for an ordered list, ascending
* Use ``-`` at a start of line followed by a space  for an ordered list, descending
* You can have multiple level of lists by chaining starter symbols like : ``* * * item``
* Use ``|`` for continuing a previous item

## Definition list

* Use ``$`` at a start of line followed by a space for the definition term
* The following line must start by blank spaces for the definition

## Tables

* Use ``|`` to limit your table and its columns
* For creating a header line, put after a it a ``|-------|`` line 
* Text modifiers, images and links can be put in a table
* LIMITATION: For now, lists can't be put in a table

## Links

* Use surrounding ``[ ]`` for a simple URL link
* Use ``[ link_name -> link ]`` for a link with a name different of the link itself
* If link is equal to ``#``, Hamill will search if it can find a corresponding inner links and put it here
* Inner links are created by the syntax ``[#...] ``and automatically for title with space are replaced by - and put in lowercase
* If link is not an URL, nor #, Hamill will search if it can find in the library of links
* An item of the library of links is defined by putting at the start of line ``[ ... ]: URL``

## Images

* Use ``[! ... ]``
* You can define a default directory where to find the images with the variable ``DEFAULT_FIND_IMAGE``

## Constants

* You can define the value of the one of the 6 constants by starting a line with ``!const`` then the constant then = and the value
* You can have multiple value definition but only the last will be taken into account
* The 6 variables :
  * ``TITLE`` to define the title of the page
  * ``ICON`` to define an icon for the page
  * ``LANG`` to define the lang of the page (default : en)
  * ``ENCODING`` to define the encoding of the page (default : utf-8)
  * ``BODY_CLASS`` to define the class of the body
  * ``BODY_ID`` to define the ID of the body

## Variables

* You can define the value of the variables by staring a line with ``!var`` then the variable then = and the value
* A variable value can change through the process of emitting HTML
   * ``EXPORT_COMMENT=true/false`` specify if entire comment lines must be emitted in HTML
   * ``PARAGRAPH_DEFINITION=true/false`` specify if definitions of a definition list must be put in paragraph (p)
   * ``DEFAULT_CODE=python/json`` define the language of the code by default (plain text by default)
   * ``NEXT_PAR_ID=ids`` specify the ID of the next paragraph
   * ``NEXT_PAR_CLASS=cls`` specify the class of the next paragraph
   * ``DEFAULT_PAR_CLASS=cls`` specify the default class of the paragraphes
   * ``DEFAULT_FIND_IMAGE=path`` specifiy a default directory where to find the included images

## Inclusion of HTML files

* Start a line with ``!include`` for emitting the content of an HTML file directly into your production

## Links to CSS and JavaScript files

* Start a line with ``!require`` for linking your production to a given CSS or JavaScript file.
* The CSS link will be put in the head
* The JavaScript link will be put where Hamill found the !require
* LIMITATION: For now, there is now to put a JavaScript link into the head

## Special

* Start a line with ``!css`` for emitting raw CSS code which will be put in the head
* Start a line with ``!html`` for emitting raw HTML code in place
