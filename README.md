# cpp-lite
A c-preprocessor like text processor written all in TypeScript

This is not yet started, but I really only need a few capabilities to start:

### Usage
`cpp-lite -I director -IanotherDir -D DEFINE -DANOTHER_DEF=HOWDY { input.txt } { -o output.txt }`

if no input.txt file is specified, will read from stdin. If no -o output.txt file is specified will output to stdout.

### Stuff supported
```C
#ifdef FOO
 #define THINGER 1234
  #else
#   ifndef BAR
#     else
#   endif
#endif

#include "../file.thing"

#define MACRO BLAH
#define MORE_STUFF blah \
 doSomeStuff(); \
 andEvenMoreStuff()
#define FUNC(a, b...) foo a . b
```

### Planned/unplanned Capabilities

* For (a, b...) b gets the "rest" of the parameters
* For now, don't use strings & the like, as I'm not going to write a full parser
* A double back-slash at the end should mean "Put a new line here, but keep the macro going"
* No token pasting (##a)
* No string pasting (# a)
* No #if <expr> of any sort
* No #include <...>
* No #include "foo\bar" cuz honestly, I use Windows a lot, but that annoys me
* No #line outputs (at least for now...)
