# `doglogger`

Thin Logger around lightweight category-based logger `debug`.

## log functions

### Categories ("channels")

* init
* load
* op
* query
* answer  
* info
* stats  
* debug  
* warn  
* detail  
* error  




## Filtering output

Each logger makes a string like `ndoc:<channel>`. This can be filtered by
the DEBUG environment variable. In the browser, it's a LocalStorage variable.
Channels are all shared. To get a subchannel call a loggers subLogger.

## Wildcards

The `*` character may be used as a wildcard. Suppose for example your library has
debuggers named "connect:bodyParser", "connect:compress", "connect:session",
instead of listing all three with
`DEBUG=connect:bodyParser,connect:compress,connect:session`, you may simply do
`DEBUG=connect:*`, or to run everything using this module simply use `DEBUG=*`.

You can also exclude specific debuggers by prefixing them with a "-" character.
For example, `DEBUG=*,-connect:*` would include all debuggers except those
starting with "connect:".


## Formatters

Debug uses [printf-style](https://wikipedia.org/wiki/Printf_format_string) formatting.
Below are the officially supported formatters:

| Formatter | Representation |
|-----------|----------------|
| `%O`      | Pretty-print an Object on multiple lines. |
| `%o`      | Pretty-print an Object all on a single line. |
| `%s`      | String. |
| `%d`      | Number (both integer and float). |
| `%j`      | JSON. Replaced with the string '[Circular]' if the argument contains circular references. |
| `%%`      | Single percent sign ('%'). This does not consume an argument. |



## More Information

See the `visionmedia/debug` documentation
([npm](https://www.npmjs.com/package/debug), [github](https://github.com/visionmedia/debug)).
