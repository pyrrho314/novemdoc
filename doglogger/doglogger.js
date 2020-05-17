//@@REFACTOR: @@DOCO: Needs commenting on what everything does.

const makeLoggerFunction = require ('debug');
const chalk = require('chalk');
const stripAnsi = require('strip-ansi');
// Each of these becomes a member function of the IonLogger and is the post-pended suffix in the
// log filter string.

// The colors are the ansi numerical colors.
// see: https://upload.wikimedia.org/wikipedia/commons/1/15/Xterm_256color_chart.svg

const NO_COLOR = false; // can turn off color

// work on dark background
const _logChannels = [
  { channel: 'init', color: 11},
  { channel: 'load', color: 192},
  { channel: 'op', color: 123},
  { channel: 'query', color: 43},
  { channel: 'answer', color: 43},
  { channel: 'info', color: 230},
  { channel: 'stats', color: 321},
  { channel: 'debug', color: 200},
  { channel: 'detail', color: 119},
  { channel: 'warn', color: 202},
  { channel: 'error', color: 160}];

class DogLogger {
  constructor(unitTag, args) {
    if(!args) {
      args = {};
    }

    this.dbgFragments = [];

    this.logFilter = process.env.DOGFILTER;
    if (this.logFilter) {
      makeLoggerFunction.enable(this.logFilter);
    }

    this.logChannels = _logChannels; // FUTURE?: pass in custom channes per logger?
    const logChannels = this.logChannels;
    if(!unitTag) {
      unitTag = args.tag;
    }
    if (!unitTag) {
      unitTag = 'doglog'
    }
    this.unitTag = unitTag;
    this.logChannels = logChannels.map((channelArg) => {
      let channel;
      let color;

      if(typeof (channelArg) === 'object') {
        ({ channel, color } = channelArg);
      } else { // assumed string @@todo: validate
        channel = channelArg;
      }

      // do alignment making namespaces all equal length
      const largestChannelSpace = '      '; // six letter word
      const justify = 'right'; // 'right' or 'left'
      const padding = largestChannelSpace.slice(channel.length);
      let channelTag = `${channel}:${unitTag}`;

      switch (justify) {
        case 'left':
          channelTag = channelTag + padding;
          break;
        case 'right':
          channelTag = padding + channelTag;
          break;
      }

      const channelLogFunction = makeLoggerFunction(channelTag);
      if(color) {
        channelLogFunction.color = color;
      }
      else
      {
        color = channelLogFunction.color; // used below
      }
      if (NO_COLOR) {
        channelLogFunction.useColors = false;
      }
      channel = channel.trim();

      //////
      ///
      /// The custom logger function, e.g. .init etc
      ///
      this[channel] = (...logargs) => {
          logargs = logargs.map( (arg) => {
              return this.replaceTokens(arg);
          });
          channelLogFunction(...logargs);
      };
      ///
      //////

      return {channel, color};
    });
  }

    subLogger(unitTag, args) {
        const augTag = `${this.unitTag}:${unitTag}`;
        return new DogLogger(augTag, args);
    }

    log(channel, ...logargs) {
        if (this[channel]) {
          this[channel](...logargs);
        }
        else
        {
          if (logargs.length > 1) {
            let logline = `(${channel}) ${logargs[0]}`;
            logargs[0] = logline;
          }
          this.info(...logargs);
        }
    }

    setDebug(debugmask) {
      if (debugmask) {
          makeLoggerFunction.enable(debugmask);
      } else {
          makeLoggerFunction.disable();
      }
    }

    addDebug(debugmask) {
      this.dbgFragments.push(debugmask);
      this.setDebug(this.dbgFragments.join(","));
    }

    useColors() {
        makeLoggerFunction.useColors();
    }

    replaceTokens(targetstring, opts = {}) {
        if (typeof(targetstring) != "string") return targetstring;
        const tokens = [
            {
                regx:/<lb>/g,
                sub: chalk.dim('\u3010'),
            },
            {
                regx:/<rb>/g,
                sub: chalk.dim('\u3011'),
            },
            {
                regx: /\<connector\>/g,
                sub: '\u255A\u2550',
            },
            {
                regx: /\<topcon\>/g,
                //sub: '\u2554\u2550',
                sub: '\u2554',
            },
            {
                regx: /\<midcon\>/g,
                //sub: '\u2560\u2550',
                sub: '\u2560',
            },

            {
                regx: /\<botcon\>/g,
                //sub: '\u255A\u2550',
                sub: '\u255A',
            },
            {
                regx: /\<flatcon\>/g,
                //sub: '\u2550\u2550',
                sub: '\u2550',
            },
            {
                regx: /\<tallcon\>/g,
                sub: '\u2551 ',
            },

            {
                regx: /\<teecon\>/g,
                sub: '\u2566',
            },
            {
                regx: /<topconend>/g,
                sub: '\u2557',
            },
            {
              regx: /<here>/g,
              sub: undefined, // set by checkFirst
              checkFirst: "caller",
            }
        ];



        const newstring = tokens.reduce( (curstr, token) => {
            let replacement = token.sub;
            if (token.checkFirst) {
                // only do expensive call when token appears
                switch (token.checkFirst) {
                    case "caller":
                        if (curstr.match(token.regx)) {
                            replacement = this.getCaller({
                                depth:5,
                                showStack:false
                            });
                            replacement = chalk.dim(replacement);
                        }
                        break;
                }

            }
            curstr = curstr.replace(token.regx, replacement);
            return curstr;
        }, targetstring);
        return newstring;
    }

  getCaller(opts = {}) {
      let caller;
      let {depth, showStack} = opts;
      if (!depth) depth = 0;
      try {
          throw new Error("trace");
      } catch (e) {
          try {
            let callstack = e.stack.split('\n')
            if (showStack) console.log("stack", callstack);
            let calltmp = callstack[3+depth];

            calltmp = calltmp.split("/");
            let ftmp = calltmp[0].split(/[\s]+/);
            let callfunc = ftmp[2];
            if (callfunc.length === 0) {
                callfunc = "<main>";
            }
            else {
                callfunc = `${callfunc}(..)`;
            }
            // usually callfile has closing parent, add leading one
            let callfile = "("+calltmp[calltmp.length-1];
            // when on top level, fallfile part won't have closing paren
            if (callfile[callfile.length-1] != ")") callfile += ")";
            //caller = caller.slice(0,caller.length-1); // removes final paren but we wanted
            caller = `${callfunc} in ${callfile}`;
            } catch (e) {
                caller = "unknown";
            }
      }
      return caller;
  }

  // special outputs
    banner(opts) {
        opts = Object.assign({}, {
            lineprint: this.op,
            fenceStr: "<flatcon>",
        }, opts)
        let {text, lineprint, fenceStr} = opts;
        if (!text) {
            text = this.getCaller() ;
        }
        let lines = text.split("\n");
        const maxlen = lines.reduce( (curmax, line) => {
            if (line.length > curmax) curmax = line.length;
            return curmax
        }, 0);
        fenceStr = this.replaceTokens(fenceStr);
        const fence = fenceStr.repeat(Math.ceil(maxlen/stripAnsi(fenceStr).length));
        lines.unshift(fence)
        lines.push (fence)
        text = lines.join("\n");
        lineprint(text);
    }

    dump(title, dict, lineprint, opts={}) {
        opts.caller = this.getCaller();
        if (typeof(title) === "object") {
            ({title,dict,lineprint} = title);
        }
        // maybe better?
        // @@refactor: create cleanDict funtion/mechanism
        let cleanDict  = {...dict};
        let cleanKeys = Object.keys(cleanDict);
        cleanDict = cleanKeys.reduce( (ac, key) => {
            if (key.match(/password/i)) {
                ac[key] = "xxxxx";
            }
            return ac;
        }, cleanDict);
        // if (cleanDict.password) {
        //     cleanDict.password = "xxxxx"
        // }
        return this.dumpDictShallow(cleanDict, lineprint, title, opts);
    }

    makeLine(opts) {
        let {
            maxkeylen,
            key,
            val,
            truncateStrings,
            alllines,
            index,
            } = opts;

            const keylen = key.length;
            const padlen = maxkeylen-key.length;
            const pad = ' '.repeat(padlen+5);
            if (truncateStrings) {
                val = this.truncateString(val, truncateStrings);
                if  (false) { //(typeof(val) === "string") {
                    const startInd = val.indexOf(truncateStrings);
                    if (startInd >= 0) {
                        const valstart = val.slice(0,startInd);
                        const valend = val.slice(startInd+truncateStrings.length);
                        const newval = valstart+chalk.bold("\u22ef")+valend;
                        val = newval;
                    }
                }
            }
        let indexStr = index ? `[${index}]` : "";
        let keyStr = index && ( index>0 ) ? key.replace(/./g, ' ') : key;
        let line = `${pad}${keyStr}:${indexStr} ${val}`;

        alllines.push(line);
    }

    dumpDictShallow(dict, lineprint, title,  opts = {}) {
        opts = Object.assign({
            hideTopFence: true,
            hideBottomFence: true,
            truncateStrings: null, // used to truncate paths with root path
        }, opts);
        let {
            caller:theCaller,
            hideCaller,
            fenceStr,hideTopFence, hideBottomFence,
            truncateStrings
            } = opts;

        if (!fenceStr) {
          fenceStr = '\u254d'
        }
        if (!lineprint) lineprint = this.detail;
        if (!dict) {
          lineprint ( `${this.getCaller()}`);
          lineprint( `<connector>can't dump null dict`);
          return;
        }
        const keys = Object.keys(dict);
        const maxlen = keys.reduce( (max, key) => (key.length>max) ? key.length:max, 0);
        const alllines = [];
        let caller = theCaller ? theCaller : this.getCaller();
        if (caller.length == 0) {
          caller = "  <main>";
        }
        if (caller[0] != " ") {
            caller = "  "+caller;
        }

        /////
        // MAKE lines from key:val
        //

        for (let key in dict) {
          const keylen = key.length;
          const padlen = maxlen-key.length;
          const pad = ' '.repeat(padlen+5);
          // console.log("bd192:", {
          //     keylen,padlen,pad,key,maxlen
          // })
          let val = dict[key];
          if (Array.isArray(val)) {
              for( let subvalIndex in val) {
                  let subval = val[subvalIndex];
                  this.makeLine({
                      key,
                      index:subvalIndex,
                      val:subval,
                      maxkeylen:maxlen,
                      alllines,
                      truncateStrings,
                  })
              }
        }
        else {
            this.makeLine({
                key,
                val,
                maxkeylen:maxlen,
                alllines,
                truncateStrings,
            })
            if (false) {
                if (truncateStrings) {
                    val = this.truncateString(val, truncateStrings);
                    if  (false) { //(typeof(val) === "string") {
                        const startInd = val.indexOf(truncateStrings);
                        if (startInd >= 0) {
                            const valstart = val.slice(0,startInd);
                            const valend = val.slice(startInd+truncateStrings.length);
                            const newval = valstart+chalk.bold("\u22ef")+valend;
                            val = newval;
                        }
                    }
                }
                let line = `${pad}${key}: ${val}`;
                alllines.push(line);
            }
        }

    }

        let maxlinelen = alllines.reduce( (curmax, line) => {
          const linelen = line.length;
          if (linelen > curmax) curmax = linelen;
          return curmax;
        }, 0);
        // doing some juggline to get the caller right justified
        if (!hideCaller) {
            const callerBlock = chalk.dim(`${caller}`);
            const callerClean = stripAnsi(callerBlock);
            const callerLen = callerClean.length;
            const enoughroom = callerLen < maxlinelen;
            const callpad = enoughroom ? " ".repeat(maxlinelen-callerLen) : "";
            if (!enoughroom) maxlinelen = callerLen;
            alllines.unshift(`${callpad}${callerBlock}`);
        }

        const frepeat = Math.ceil(maxlinelen/fenceStr.length);
        const fence = fenceStr.repeat(frepeat);
        let prebottom = this.replaceTokens("<flatcon>");
        const pbrepeat = Math.ceil(maxlinelen/prebottom.length);
        prebottom =  this.replaceTokens("<botcon>") + prebottom.repeat(pbrepeat);
        if (!hideTopFence) lineprint(fence);
        if (title) {
            const titleline = `<topcon><flatcon><flatcon> ${chalk.blue.bold(title)}`;
            lineprint(this.replaceTokens(titleline));
        }

        //////
        // print lines
        //
        for (let lineNum in alllines) {
            const line = alllines[lineNum];
            let pre;
            // what to put before each line for visual grouping
            if (lineNum == 0 && !title) {
                pre = this.replaceTokens('<topcon>');
            }
            else if (lineNum == alllines.length-1) {
                // pre = this.replaceTokens('<botcon>');
                pre = this.replaceTokens('<tallcon>');
            } else {
                pre = this.replaceTokens('<tallcon>');
            }
            const realLen = stripAnsi(line).length;
            const needspadding = realLen < maxlinelen
            const useline = needspadding ?
                line + " ".repeat(maxlinelen - realLen)
                : line;
            lineprint(pre+useline);
        }
        lineprint(prebottom);
        if (!hideBottomFence) lineprint(fence);
    }

    table(opts) {
            opts = Object.assign({}, {
            lineprint: this.op,
        }, opts)
        let {text, rows, lineprint} = opts;
        lineprint(text);
        console.table(rows);

    }
    truncateString(orig, minus) {
        if (typeof(orig) === "string") {
            const startInd = orig.indexOf(minus);
            if (startInd >= 0) {
                const valstart = orig.slice(0,startInd);
                const valend = orig.slice(startInd+minus.length);
                let newval = valstart+chalk.bold("\u22ef")+valend;
                // if the whole string was the replacement text, show anyway
                // on assumption it's trying to show the rootRoot or equiv
                if ( valstart.length == 0 && valend.length ==0) {
                    newval = orig;
                }
                return newval;
            }
        }
        return orig;
    }
    /* Semantic Color Definitions
        Turning ideas into colors and nice Ansi effects.
    */
    get clr() {
        return {
            bright: (arg) => this.clrBright(arg),
            created: (arg) => this.clrCreated(arg),
            brightDivide: (arg) => this.clrCreated(arg),
        }
    }

    clrCreated(arg) {
        return chalk.keyword('orange')(arg);
    }

    clrBrightDivide(arg) {
        return chalk.bold(arg);
    }
    clrBright(arg) {
        return chalk.white.bold(arg);
    }
}

module.exports = {
  default: DogLogger,
  DogLogger
}
