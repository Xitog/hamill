from setuptools import setup
import hamill

f = open('README.md', mode='r', encoding='utf8')
long_desc = f.read()
f.close()

setup(
    # Metadata
    name='hamill',
    version=hamill.__version__,

    license="MIT",

    author='Damien Gouteux',
    author_email='damien.gouteux@gmail.com',
    url="https://xitog.github.io/dgx/informatique/hamill.html",
    maintainer='Damien Gouteux',
    maintainer_email='damien.gouteux@gmail.com',
    
    description='A lightweight markup language',
    long_description=long_desc,
    long_description_content_type="text/markdown",
    # https://pypi.org/classifiers/
    classifiers=[
        'Development Status :: 3 - Alpha',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Programming Language :: Python :: 3 :: Only',
        'Programming Language :: Python :: Implementation :: CPython',
        'Topic :: Text Processing :: Markup',
        'Topic :: Text Processing :: Markup :: HTML',
        'Topic :: Software Development :: Libraries :: Python Modules',
        'Topic :: Software Development :: Documentation',
        'Topic :: Internet :: WWW/HTTP :: Site Management',
        'Topic :: Internet :: WWW/HTTP :: Dynamic Content :: CGI Tools/Libraries'
    ],
    keywords=['hamill', 'lml', 'lightweight markup language', 'markup', 'text', 'html'],
    
    packages=['hamill'],  #same as name
    python_requires='>=3.5',
    install_requires = ['weyland'], #external packages as dependencies
    #zip_safe=True,
    #extras_require={}
)
