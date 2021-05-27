#------------------------------------------------------------------------------
# Imports
#------------------------------------------------------------------------------
import genericpath
import hamill
import weyland
import locale
from datetime import datetime

#------------------------------------------------------------------------------
# Constants
#------------------------------------------------------------------------------
DATETIME_EN = datetime.now().strftime('%d %B %Y')
try:
    locale.setlocale(locale.LC_TIME, 'fr_FR.UTF-8')
except locale.Error:
    print('Locale set to default')
    locale.setlocale(locale.LC_TIME, '')
DATETIME_FR = datetime.now().strftime('%d %B %Y')

#------------------------------------------------------------------------------
# Globals
#------------------------------------------------------------------------------
good : int = 0
bad  : int = 0
stop_on_error : bool = True

#------------------------------------------------------------------------------
# Functions
#------------------------------------------------------------------------------
def verify(source, answer, check, msg=None):
    global good, bad
    res : str = str(answer)
    compare : bool = (res == check)
    if compare:
        good += 1
        print(f'Test n°{good + bad} OK')
        print('---')
        if res.find('\n') == -1:
            print('RESULT :', res)
        else:
            print('RESULT:')
            print(res)
        if len(res) > 0 and res[-1] != '\n':
            print()
    else:
        bad += 1
        print(f'Test n°{good + bad} ERROR')
        print('---')
        print(f'Source ({len(source)} chars):')
        if source.find('\n') == -1:
            print('SOURCE :', source.replace('\n', '<NL>\n'))
        else:
            print('SOURCE :')
            print(source.replace('\n', '<NL>\n'))
        #print(f'up: res {len(s)} chars --- down {len(check)} chars : awaited result')
        print(f'Result has {len(res)} chars')
        if res.find('\n') == -1:
            print('RESULT :', res.replace('\n', '<NL>\n'))
        else:
            print('RESULT :')
            print(res.replace('\n', '<NL>\n'))
        print(f'Awaited result has {len(check)} chars:')
        if check.find('\n') == -1:
            print('AWAITED:', check.replace('\n', '<NL>\n'))
        else:
            print('AWAITED:')
            print(check.replace('\n', '<NL>\n'))
        nb = 5
        for i in range(0, min(len(res), len(check))):
            if res[i] != check[i]:
                print('>>>', i, res[i], check[i])
                nb -= 1
            if nb == 0: break
        if stop_on_error:
            if msg is not None:
                print("Unexpected result: " + str(answer))
            else:
                print("Unexpected result")
            exit()

#------------------------------------------------------------------------------
# Tests
#------------------------------------------------------------------------------
tests = [
    {
        # Test 1
        'source': "**bold** ''italic'' __underline__ --strike-- ^^super^^",
        'result': "<b>bold</b> <i>italic</i> <u>underline</u> <s>strike</s> <sup>super</sup>", 
        'msg':  "process() => Bold/Italic error"
    },
    {
        # Test 2
        'source': "@@code@@",
        'result': '<code><span class="text-normal">code</span></code>',
        'msg':    "process() => Code error"
    },
    {
        # Test 3
        'source': """* item 1
* item 2
* item 3""",
        'result': """<ul>
  <li>item 1</li>
  <li>item 2</li>
  <li>item 3</li>
</ul>
""",
        'msg':  "process() => List error on simple list unordered with *"
    },
    {
        # Test 4
        'source': """• item 1
• item 2
• item 3""",
        'result': """<ul>
  <li>item 1</li>
  <li>item 2</li>
  <li>item 3</li>
</ul>
""",
        'msg':  "process() => List error on simple list unordered with •"
    },
    {
        # Test 5
        'source': """+ item 1
+ item 2
+ item 3""",
        'result': """<ol>
  <li>item 1</li>
  <li>item 2</li>
  <li>item 3</li>
</ol>
""",
        'msg':  "process() => List error on simple list ordered"
    },
    {
        # Test 6
        'source':"""- item 1
- item 2
- item 3""",
        'result': """<ol reversed>
  <li>item 1</li>
  <li>item 2</li>
  <li>item 3</li>
</ol>
""",
        'msg':  "process() => List error on simple list ordered reversed"
    },
    {
        # Test 7
        'source': """* item 1
* item 2
* * item 2.1
* * item 2.2
* item 3""",
        'result': """<ul>
  <li>item 1</li>
  <li>item 2
    <ul>
      <li>item 2.1</li>
      <li>item 2.2</li>
    </ul>
  </li>
  <li>item 3</li>
</ul>
""",
        'msg': "process() => List error on list inner list (same)"
    },
    {
        # Test 8
        'source': """* item 1
* item 2
% % item 2.1
% % item 2.2
* item 3""",
        'result': """<ul>
  <li>item 1</li>
  <li>item 2
    <ol>
      <li>item 2.1</li>
      <li>item 2.2</li>
    </ol>
  </li>
  <li>item 3</li>
</ul>
""",
        'msg': "process() => List error on list inner list (mixed)"
    },
    {
        # Test 9
        'source': """* item 1
* item 2 première ligne
| item 2 seconde ligne
* item 3""",
        'result':"""<ul>
  <li>item 1</li>
  <li>item 2 première ligne
  <br>item 2 seconde ligne</li>
  <li>item 3</li>
</ul>
""",
        'msg': "process() => List error on continuity"
    },
    {
        # Test 10
        'source': """{{.jumbotron}}
Je suis dans une div !
{{end}}""",
        'result': """<div class="jumbotron">
<p>Je suis dans une div !</p>
</div>
""",
        'msg': "process() => Div creation with class error"
    },
    {
        # Test 11
        'source': """{{#content-div}}
Je suis dans une div !
{{end}}""",
        'result': """<div id="content-div">
<p>Je suis dans une div !</p>
</div>
""",
        'msg': "process() => Div creation with ID error"
    },
    {
        # Test 12
        'source': """{{#content-div .jumbotron}}
Je suis dans une div !
{{end}}""",
        'result': """<div id="content-div" class="jumbotron">
<p>Je suis dans une div !</p>
</div>
""",
        'msg': "process() => Div creation with ID and class error"
    },
    {
        # Test 13
        'source': """{{.red rouge}} ou {{.green vert}} ou {{rien}}""",
        'result': """<span class="red">rouge</span> ou <span class="green">vert</span> ou <span>rien</span>""",
        'msg': "process() => Span class error"
    },
    {
        # Test 14
        'source': """{{.signature}}ceci est une signature\n""",
        'result': """<p class="signature">ceci est une signature</p>\n""",
        'msg': "process() => Paragraph creation with class error"
    },
    {
        # Test 15
        'source': """{{#signature}}ceci est une signature\n""",
        'result': """<p id="signature">ceci est une signature</p>\n""",
        'msg': "process() => Paragraph creation with ID error"
    },
    {
        # Test 16
        'source': """{{#signid .signclass}}ceci est une signature\n""",
        'result': """<p id="signid" class="signclass">ceci est une signature</p>\n""",
        'msg': "process() => Paragraph creation with ID and class error"
    },
    {
        # Test 17 Direct link to URL
        'source': """[>https://pipo.html]\n""",
        'result': """<p><a href="https://pipo.html">https://pipo.html</a></p>
""",
        'msg': "Direct link to URL => Error"
    },
    {
        # Test 18 Direct link to REF
        'source': """[>REF]
[REF]: https://zembla.org""",
        'result': """<p><a href="https://zembla.org">REF</a></p>
""",
        'msg': "Direct link to REF => Error"
    },
    {
        # Test 19 Named link to URL
        'source': """[pipo->https://pipo.html]\n""",
        'result': """<p><a href="https://pipo.html">pipo</a></p>
""",
        'msg': "Named link to URL => Error"
    },
    {
        # Test 20 Named link to REF
        'source': """[this is a REF->REF]
[REF]: https://zembla.org""",
        'result': """<p><a href="https://zembla.org">this is a REF</a></p>
""",
        'msg': "Named link to REF => Error"
    },
    {
        # Test 21 Named link to TITLE through #
        'source': """[this goes to a title->#]
# This goes to a title""",
        'result': """<p><a href="#this-goes-to-a-title">this goes to a title</a></p>
<h1 id="this-goes-to-a-title">This goes to a title</h1>
""",
        'msg': "Named link to TITLE through # => Error"
    },
    {
        # Test 22 Not a link 1
        'source': """https://pipo.html\n""",
        'result': """<p>https://pipo.html</p>
""",
        'msg': "Not a link 1 => Error"
    },
    {
        # Test 23 Not a link 2
        'source': """>https://pipo.html\n""",
        'result': """<p>&gt;https://pipo.html</p>
""",
        'msg': "Not a link 2 => Error"
    },
    {
        # Test 24 List and direct link
        'source': """* [>https://pipo.html]\n""",
        'result': """<ul>
  <li><a href="https://pipo.html">https://pipo.html</a></li>
</ul>
""",
        'msg': "List and direct link => Error"
    },
    {
        # Test 25 Title transformation
        'source': """## Les jeux""",
        'result': """<h2 id="les-jeux">Les jeux</h2>""",
        'msg': "Title transformation => Error"
    },
    {
        # Test 26 display a constant (English date) in process_string
        'source': "This text has been generated on [=GENDATE]",
        'result': f"This text has been generated on {DATETIME_EN}",
        'msg': "Output English gendate from process() => Error",
        'default_lang': 'en'
    },
    {
        # Test 27 display a constant (French date) in process_string
        'source': "Ce texte a été généré le [=GENDATE]",
        'result': f"Ce texte a été généré le {DATETIME_FR}",
        'msg': "Output French gendate from process() => Error",
        'default_lang': 'fr'
    },
    {
        # Test 28 display a constant (French date) in process_lines
        'source': "Ce texte a été généré le [=GENDATE]",
        'result': f"Ce texte a été généré le {DATETIME_FR}",
        'msg': "Output French gendate from process() => Error",
        'default_lang': 'fr'
        # Test 28 et 27 sont maintenant les mêmes
    },
    {
        # Test 29 python
        'source': "@@python if a == 5: break@@",
        'result': '<code><span class="python-keyword">if</span><span class="python-blank"> </span><span class="python-identifier">a</span><span class="python-blank"> </span><span class="python-operator">==</span><span class="python-blank"> </span><span class="python-integer">5</span><span class="python-operator">:</span><span class="python-blank"> </span><span class="python-keyword">break</span></code>',
        'msg': "Python code on one line with weyland"
    },
    {
        # Test 30 python
        'source': """@@@python
if a == 5:
    break
@@@""",
        'result': """<pre class="code">
<span class="python-keyword">if</span><span class="python-blank"> </span><span class="python-identifier">a</span><span class="python-blank"> </span><span class="python-operator">==</span><span class="python-blank"> </span><span class="python-integer">5</span><span class="python-operator">:</span>
<span class="python-blank">    </span><span class="python-keyword">break</span>
</pre>
""",
        'msg': "Python code on multilines with weyland"
    },
    {
        # Test 31 vu dans ash_guide.html
        'source': """@@@text
-- fonction factorielle récursive
fun fact(nb : int)
    if nb == 0 then
        return 1
    elif nb > 0 then
        return nb * fact(nb - 1)
    else
        raise Exception("Invalid number")
    end
end
nb = input('enter a number:')
writeln(fact(nb))
@@@""",
        'result': """<pre class="code">
<span class="text-normal">-- fonction factorielle récursive</span>
<span class="text-normal">fun fact(nb : int)</span>
<span class="text-normal">    if nb == 0 then</span>
<span class="text-normal">        return 1</span>
<span class="text-normal">    elif nb &gt; 0 then</span>
<span class="text-normal">        return nb * fact(nb - 1)</span>
<span class="text-normal">    else</span>
<span class="text-normal">        raise Exception(&quot;Invalid number&quot;)</span>
<span class="text-normal">    end</span>
<span class="text-normal">end</span>
<span class="text-normal">nb = input(&#x27;enter a number:&#x27;)</span>
<span class="text-normal">writeln(fact(nb))</span>
</pre>
""",
        'msg': "Bug: double replace html entity"
    },
    {
        # Test 32 code inside a line
        'source': "quand on fait @@python a > 5@@ on teste",
        'result': """quand on fait <code><span class="python-identifier">a</span><span class="python-blank"> </span><span class="python-operator">&gt;</span><span class="python-blank"> </span><span class="python-integer">5</span></code> on teste""",
        'msg': 'Problème avec code dans une ligne'
    }
]

def execute_tests():
    start = datetime.now()
    print('Hamill version:', hamill.__version__)
    do = [] # let empty to execute all the test. Add integers to execute only these tests.
    nb = 1
    for t in tests:
        if len(do) == 0 or nb in do:
            gen = None
            if 'default_lang' in t:
                gen = hamill.Generation(default_lang=t['default_lang'])
            print(f'- {nb} -------------------------------------------------------------------')
            res = hamill.process(t['source'], gen=gen)
            verify(t['source'], res, t['result'], t['msg'])
        nb += 1
    stop = datetime.now()
    print()
    print(f"Duration                  : {stop - start}")
    print(f"Version of Hamill tested  : {hamill.__version__}")
    print(f"Version of Weyland tested : {weyland.__version__}")
    print(f"Number of tests passed    : {good:2d} / {good+bad}")
    print(f"Number of tests failed    : {bad:2d} / {good+bad}")

if __name__ == '__main__':
    execute_tests()
