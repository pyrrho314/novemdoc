[pushed from submodule]
# NovemDoc

NovemDoc is part of a general purpose processing model in which:

* all processed accept input
* all processes emit output
* therefore all processes are data transformations (input)->(ouput)

In this model event are merely input or output events, the reaction is not an
*action*, but a *transformation*. Put elsewhise an "action" is always
also such a particular class of "transformation".

The NovemDoc is the *put*, absorbed and emitted.

Imagining all encapsulation as JSON (an abstraction that can be materialized by
converting other formats into JSON, and ignoring the text encoding, thinking
in terms of nested maps and lists), the NovemDoc is as follows in practice:

* it wraps a member, `dict` that is a JSON serializable "nested dict", aka,
  Javascript Object with JSON serializable members (for mongo store, including
  the Mongo extensions to serializable types, and also extensible with anything
  the user makes serializable-deserializable). This ensures the document is
  always ready for transmission (including storage).
* annotates the document (i.e. with a _ndoc sub-document containing document
  metadata, such as the doctype).
* uses dot notation to set and get properties
* while the NovemDoc object adds convienience to handling the dict, and subclasses
  can further proxy properties that are stored in the dict, and any 
  object oriented feature can be added, focus on the nested dict means this
  class plays well with code that handles the JSON object directly.

Helps to:

* store in mongo


Status:

I've built this type of class several times over the last year, this is just
the base of trying to make it one last time for reuse. Some of the things that
I've done in such classes:

* support for transformations
* support for object merge
* disk storage
* more metadata
* document decomposition and recomposition
* some sort of schema support

Other things:

* graph db and graphql support
