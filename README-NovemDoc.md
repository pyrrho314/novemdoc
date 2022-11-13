# NovemDoc

Git Repo: https://github.com/pyrrho314/novemdoc

NovemDoc is part of a general purpose processing model in which:

* all coding units (functions/processes) accept input
* all coding units emit output
* therefore all processes are data transformations (input)->(ouput)

In this model events are merely input or output events, the reaction is not an
*action*, but a *transformation*. Put another way, the "action" is always 
also a particular class of "transformation".

The NovemDoc is the object meant to be used as input and output, to be absorbed and emitted.

Imagining all encapsulation as JSON (an abstraction that can be materialized by
converting other formats into JSON, and ignoring the text encoding, thinking
in terms of nested maps and lists), the NovemDoc is as follows in practice:

* It wraps a member, `dict` that is a JSON serializable "nested dict", aka, a Pure
  Javascript Object with only JSON serializable members. Note: this is not enforced
  by NovemDoc but assumed. In some cases this will be handled well, i.e. sending a
  document to Mongo will accept dates, b/c to Mongo that is a build in type, but
  serializing to disk will not encode the date without a special serializer.
  Keeping all members in base data types ensures the document is always ready
  for transmission (including storage).
* It annotates the document (i.e. with a `_ndoc` sub-document that contains document
  metadata, such as the doctype). Note that this is only viable when the document
  is completely under control, if wrapping an object where _ndoc is not a legal part
  of the schema, that document should be stored as a subdocument so NovemDoc. Other
  solutions are also possible, of course.
* It relies heavilly on the concept and usage of dot notation to set and get properties.
  It will flatten objects to a shallow object with dot notation keys, and exploit this
  to implement certain general purpose transformations.
* While the NovemDoc object adds convienience to handling the `dict` (parsed JSON object),
  it's essential that at any point the dict can be taken and used, and will contain
  all the relevant data, i.e. NovemDoc retains no special information that needs to be
  added to the data. The same is true of a subclass, in which one might want member
  functions that are "smart" and know what sort of data they contain and provide
  object oriented member syntax for getters and setters and special functions. In this
  case all getters should get from the dictionary, and all setters should set to the 
  dictionary, and all functions should work directly on the dictionary. Any caching
  for whatever purpose simply has to satisfy the constraint of behaving this way,
  with at the least serializing any data changes to the dictionary immediately.
  This constraint is assumed by the control systems that automatically handle NovemDoc
  instances. Ideally ALL state of a NovemDoc instance or child class is in the dictionary.
  Strictly all state that needs to be persisted or communicated must be in the dictionary
  at all times.

## NovemRecipe

The Novem Recipe system is a lightweight mechanism for executing lists of functions, passing
the output of one as the input to the next. Several types of recipe step will be supported,
at the moment there is an object oriented approach, and also a way to wrap routines (functions,
asyncFunctions, generators and asyncGenerators).

## DogLogger

This repo also included doglogger which uses the `debug` logger. I'd like to change refactor
this, possibly without `debug` which I love but I have never found my perfect logger and
I have some fresh ideas :)  Also, at the least, the logger needs to be more data oriented and
machine friendly.

## Status

I've built this type of class several times over the last few years, and this is just
the base of trying to make it one last time for reuse. Some of the things that
I've done in such classes:

* more documentation
* support for transformations
* support for object merge
* disk storage
* more metadata
* document decomposition and recomposition
* some sort of schema support

Other things:

* graph db and graphql support

### Debugging/Logging

To get verbose logging set DEBUG=* (or other mask to filter particular log messages).
