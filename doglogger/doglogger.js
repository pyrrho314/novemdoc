const makeLoggerFunction = require ('debug');

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
  { channel: 'debug', color: 200},
  { channel: 'detail', color: 119},
  { channel: 'warn', color: 202},
  { channel: 'error', color: 160}];

class DogLogger {
  constructor(unitTag, args) {
    if(!args) {
      args = {};
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
      this[channel] = (...logargs) => {
        channelLogFunction(...logargs);
      };
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
        logargs[0] = `(${channel}) ${logargs[0]}`;
      }
      this.info(...logargs);
    }
  }
}

module.exports = {
  default: DogLogger,
  DogLogger
}
