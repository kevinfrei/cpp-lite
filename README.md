# cpp-lite

A c-preprocessor like text processor written all in TypeScript

This is not yet started, but I really only need a few capabilities to start:

### Usage

`cpp-lite -I director -IanotherDir -D DEFINE -DANOTHER_DEF=HOWDY { input.txt } { -o output.txt }`

if no input.txt file is specified, will read from stdin. If no -o output.txt
file is specified will output to stdout.

### Stuff supported

```C
#ifdef FOO
 #define THINGER 1234
  #else
#   ifndef BAR
#     else
#   endif
#endif

#undef MACRO

#include "../file.thing"

#define MACRO BLAH
#define MORE_STUFF blah \
 doSomeStuff(); \
 andEvenMoreStuff()
// NYI:
#define FUNC(a, b...) foo a . FUNC(b)
#define FUNC(a) bar(a)
// NYI;
// You can do some weird stuff with rest params:
#define MYFUNC(a, b..., c, d) first a then c, and d, but don't forget MYFUNC(b)
#define MYFUNC(a, b, c) This forces MYFUNC to only have multiples of 3 parameters
```

### Planned/unplanned Capabilities

- For (a, b...) b gets the "rest" of the parameters
- For now, don't use strings & the like, as I'm not going to write a full parser
- A double back-slash at the end should mean "Put a new line here, but keep the
  macro going"
- No token pasting (##a)
- No string pasting (# a)
- No #if <expr> of any sort
- No #include <...>
- No #include "foo\bar" cuz honestly, I use Windows a lot, but that annoys me
- No #line outputs (at least for now...)
