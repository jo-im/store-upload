import React, { Component } from "react";
import autoBind from "react-autobind";
import CopyToClipboard from "react-copy-to-clipboard";
import queryString from "query-string";
import { EditableInput } from "react-color/lib/components/common";
import IconClose from "./icons/IconClose";
import IconColorPicker from "./icons/IconColorPicker";
import IconCopy from "./icons/IconCopy";

class EmbedConfig extends Component {
  constructor(props) {
    super(props);

    this.state = {
      accentColor: "#29D5EF",
      embedCopied: false,
      playerColor: "#F6F6F6",
      waveColor: "#CDCDCD"
    };

    autoBind(this);
  }

  changeColor(element, color) {
    const { hex } = color;
    const state = {};

    state[`${element}Color`] = hex;

    this.setState(state);
  }

  updateEmbedCode(audio) {
    const embedCode = `<iframe height="210" width="100%" scrolling="no" frameborder="0" src="${this.updateIframeSrc(
      audio
    )}"/>`;

    return embedCode;
  }

  updateIframeSrc(audio) {
    const { imageUrl } = this.state;
    const { contributors, files, title } = audio;
    const audioElements = ["accent", "player", "wave"];

    const iframeSrcObj = {
      contributors,
      title,
      url: files["mp3_128"]
    };

    if (imageUrl) {
      iframeSrcObj.image = imageUrl;
    }

    audioElements.forEach(audioElement => {
      const color = this.state[`${audioElement}Color`];
      iframeSrcObj[`${audioElement}Color`] = color;
    });

    const iframeSrc = `http://localhost:8000/embed?${queryString.stringify(
      iframeSrcObj
    )}`;

    return iframeSrc;
  }

  updateImage(e) {
    const imageUrl = e.target.value;
    this.setState({ imageUrl });
  }

  validateColor(element, hex) {
    // Check if hex code is valid
    const regExp = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
    const validHexCode = regExp.test(hex);

    if (validHexCode) {
      this.changeColor(element, { hex });
    }
  }

  render() {
    const { audio, toggleEmbedConfig } = this.props;
    const { accentColor, embedCopied, playerColor, waveColor } = this.state;

    const colorElements = [
      { color: playerColor, element: "player", title: "Background Color" },
      { color: accentColor, element: "accent", title: "Accent Color" },
      { color: waveColor, element: "wave", title: "Wave Color" }
    ];

    return (
      <div className="expanded-embed">
        <div className="expanded-embed__close-container">
          <div className="expanded-embed__close" onClick={toggleEmbedConfig}>
            <IconClose />
            <span>Close</span>
          </div>
        </div>
        <div className="expanded-embed__header">
          <span className="expanded-embed__title">Embeddable Player</span>
          <span className="expanded-embed__directions">
            Configure the player using the options below.
          </span>
        </div>
        <iframe
          id="embeddable-audio-player"
          scrolling="no"
          src={this.updateIframeSrc(audio)}
        />
        <div className="expanded-embed__color">
          <span className="expanded-embed__color-title expanded-embed__config-titles">
            Color
          </span>
          <div className="expanded-embed__color-pickers">
            {colorElements.map(colorElement => {
              return (
                <div key={colorElement.title}>
                  <span className="expanded-embed__color-type">
                    {colorElement.title}
                  </span>
                  <div className="expanded-embed__color-picker-container">
                    <div
                      className="expanded-embed__color-box"
                      style={{
                        backgroundColor: colorElement.color
                      }}
                    />
                    <EditableInput
                      onChange={this.validateColor.bind(
                        this,
                        colorElement.element
                      )}
                      style={{
                        input: {
                          boxSizing: "border-box",
                          height: "35px",
                          paddingLeft: "11px",
                          width: "80px"
                        }
                      }}
                      value={colorElement.color}
                    />
                    <IconColorPicker />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="expanded-embed__album-art">
          <span className="expanded-embed__config-titles">Album Art</span>
          <input
            className="expanded-embed__input"
            onChange={this.updateImage}
            placeholder="Insert Image URL here"
            type="text"
          />
        </div>
        <div className="expanded-embed__embed-code">
          <span className="expanded-embed__config-titles">Embed Code</span>
          <div className="expanded-embed__input expanded-embed__embed-code-textarea">
            <span className={embedCopied ? "expanded-embed__copied" : ""}>
              {this.updateEmbedCode(audio)}
            </span>
          </div>
          <CopyToClipboard
            onCopy={(text, result) => {
              this.setState({ embedCopied: false });
              if (result) {
                setTimeout(() => {
                  this.setState({ embedCopied: result });
                }, 50);
              }
            }}
            text={this.updateEmbedCode(audio)}
          >
            <div className="expanded-embed__copy">
              <IconCopy />
            </div>
          </CopyToClipboard>
        </div>
      </div>
    );
  }
}

export default EmbedConfig;
