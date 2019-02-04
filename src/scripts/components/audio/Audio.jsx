import React from "react";
import { Prompt } from "react-router-dom";
import Wavesurfer from "react-wavesurfer";
import { ChromePicker } from "react-color";
import AudioStore from "./audio-store";
import AudioActions from "./audio-actions";
import Metadata from "./Metadata";
import DeleteModal from "./DeleteModal";
import AudioPageTitleForm from "./AudioPageTitleForm";
import ModifyAudioFile from "./ModifyAudioFile";
import AudioPlayPause from "./AudioPlayPause";
import AudioUploadMessages from "./AudioUploadMessages";
import CopyDownload from "./CopyDownload";
import autoBind from "react-autobind";
import { getDuration, isValidLength } from "../../services/audio-tools";
import ContributorStore from "../../components/contributor/contributor-store";
import SingleAudioDropzone from "./SingleAudioDropzone";
import DropstripStore from "../dropstrip/dropstrip-store";
import queryString from "query-string";
import ColorPicker from "../color-picker/ColorPicker";

const initialState = {
  buttonColor: "#2db2cc",
  imageUrl: "",
  inEditMode: false,
  playerColor: "white",
  progressColor: "#0fb3cc",
  validTitle: true,
  validContributors: true,
  waveColor: "#a2e0e3",
  playing: false,
  pos: 0
};

export default class Audio extends React.Component {
  constructor(props) {
    super(props);
    this.MAX_CHAR_LENGTH = 4;
    this.state = initialState;
    this.baseState = this.state;
    this.audioId = props.match.params.id.split("-")[0];
    autoBind(this);
  }

  componentDidMount() {
    AudioStore.addChangeListener(this.onChange);
    AudioStore.fetch(this.audioId);
    ContributorStore.addChangeListener(this.populateContributorsSuggestions);
    ContributorStore.get();
  }

  componentWillUnmount() {
    AudioStore.removeChangeListener(this.onChange);
    ContributorStore.removeChangeListener(this.populateContributorsSuggestions);
    this.setState(this.baseState);
  }

  changeColor(element, color) {
    const { r, g, b, a } = color.rgb;
    const rgba = `rgba(${r}, ${g}, ${b}, ${a})`;
    const state = {};

    state[`${element}Color`] = rgba;

    this.setState(state);
  }

  onChange(changeType) {
    const inEditMode = this.state.inEditMode;
    if (changeType === "saved") {
      this.setState({
        audio: AudioStore.get(),
        inEditMode
      });
    } else if (changeType === "validate") {
      this.setState({
        validContributor: AudioStore.getValidation()
      });
    } else if (changeType === "deleted") {
      this.props.history.push("/");
    } else {
      const audio = AudioStore.get();
      if (this.state.playing && inEditMode) {
        this.setState({
          playing: false
        });
      }
      this.setState({
        audio,
        inEditMode,
        formTitle: audio.title,
        formContributors: audio.contributors,
        formTags: audio.tags
      });
      if (!inEditMode) {
        this.setState({
          replacing: false,
          uploadError: false
        });
      }
    }
  }

  onTitleChange(e) {
    const str = e.target.value;
    const valid = !!isValidLength(str, this.MAX_CHAR_LENGTH);
    this.setState({
      formTitle: str,
      validTitle: valid
    });
  }

  onContributorsChange(str) {
    const valid = !!isValidLength(str, this.MAX_CHAR_LENGTH);
    this.setState({
      formContributors: str,
      validContributors: valid
    });
  }

  onTagsChange(e) {
    this.setState({
      formTags: e.target.value
    });
  }

  onCompletedUpload() {
    AudioStore.fetch(this.audioId);
    this.setState({
      completed: true,
      replacing: false
    });
    if (this.waveNode) {
      const mp3Url = this.state.audio.files["mp3_128"];
      this.waveNode._loadAudio(mp3Url);
    }
  }

  onUploadError() {
    this.setState({ replacing: false, uploadError: true, completed: false });
  }

  onReplacing() {
    DropstripStore.clearQueue();
    this.setState({ replacing: true, completed: false, uploadError: false });
  }

  onCancelReplacing() {
    DropstripStore.clearQueue();
    this.setState({ replacing: false, completed: false, uploadError: false });
  }

  toggleEditMode(bool) {
    if (!bool) {
      DropstripStore.clearQueue();
      this.setState({ inEditMode: bool, replacing: false });
    } else {
      this.setState({ inEditMode: bool, playing: false });
    }
  }

  handleCloseModal() {
    this.setState({ showModal: false });
  }

  handleDeleteAudio() {
    this.setState({ showModal: false });
    AudioActions.delete();
  }

  handleTogglePlay() {
    if (this.state.inEditMode) {
      return;
    }
    // Load the mp3 the first time user presses 'play'
    if (!this.state.playing && !this.state.waveState) {
      this.setState({ waveState: "loading" });
    }
    this.setState({
      playing: !this.state.playing
    });
  }

  handlePosChange(e) {
    const pos = e.originalArgs[0];
    this.setState({
      pos,
      timestamp: getDuration({ duration: pos })
    });
  }

  save() {
    if (
      !!isValidLength(this.state.formTitle, this.MAX_CHAR_LENGTH) &&
      !!isValidLength(this.state.formContributors, this.MAX_CHAR_LENGTH)
    ) {
      AudioActions.save({
        id: this.audioId,
        title: this.state.formTitle,
        contributors: this.state.formContributors,
        tags: this.state.formTags
      });
      const newAudio = this.state.audio;
      newAudio.title = this.state.formTitle;
      newAudio.contributors = this.state.formContributors;
      this.setState({
        audio: newAudio
      });
      this.toggleEditMode(false);
    }
  }

  populateContributorsSuggestions() {
    this.setState({
      contributorsSuggestions: ContributorStore.getList()
    });
  }

  updateIframeSrc(audio) {
    const { imageUrl } = this.state;
    const { contributors, files, title } = audio;
    const audioElements = ["button", "player", "progress", "wave"];

    const iframeSrcObj = {
      url: files["mp3_128"],
      contributors,
      title
    };

    if (imageUrl) {
      iframeSrcObj.image = imageUrl;
    }

    audioElements.forEach(audioElement => {
      const color = this.state[`${audioElement}Color`];

      if (color) {
        iframeSrcObj[`${audioElement}Color`] = color;
      }
    });

    const iframeSrc = `/embed?${queryString.stringify(iframeSrcObj)}`;

    return iframeSrc;
  }

  updateImage(e) {
    const imageUrl = e.target.value;
    this.setState({ imageUrl });
  }

  render() {
    const audio = this.state.audio;
    const editing = this.state.inEditMode;
    const validForm = this.state.validTitle && this.state.validContributors;
    let replaceButtonClass = "hidden";
    if (editing && !this.state.replacing) {
      replaceButtonClass = "replace__button";
    }
    let fileItems;
    if (audio && audio.files) {
      fileItems = Object.keys(audio.files).map(type => (
        <div key={type} className="file-list__item">
          {audio.files[type]}
        </div>
      ));
    }

    const waveSurferOptions = {
      normalize: true,
      barWidth: 1,
      cursorWidth: 0,
      progressColor: "#0fb3cc",
      scrollParent: true,
      waveColor: "#a2e0e3",
      height: 75,
      backend: "MediaElement"
    };

    const colorElements = [
      { color: this.state.playerColor, element: "player" },
      { color: this.state.buttonColor, element: "button" },
      { color: this.state.waveColor, element: "wave" },
      { color: this.state.progressColor, element: "progress" }
    ];

    return (
      <div>
        <Prompt
          when={this.state.inEditMode}
          message={() =>
            `You are still in edit mode. Is it okay to leave this page?`
          }
        />
        {audio && (
          <div className="audio-page__container">
            <DeleteModal
              fileItems={fileItems}
              handleDeleteAudio={this.handleDeleteAudio}
              handleCloseModal={this.handleCloseModal}
              showModal={this.state.showModal}
            />
            <AudioPageTitleForm
              editing={editing}
              validTitle={this.state.validTitle}
              title={audio.title}
              value={this.state.formTitle}
              onTitleChange={this.onTitleChange}
              maxCharLength={this.MAX_CHAR_LENGTH}
            />
            <div className="row">
              <ModifyAudioFile
                audio={audio}
                inEditMode={this.state.inEditMode}
                onEdit={this.toggleEditMode}
                save={this.save}
                validForm={validForm}
                onDelete={() => this.setState({ showModal: true })}
              />
              <div className="col s10">
                {this.state.replacing && (
                  <SingleAudioDropzone
                    onCancelReplacing={this.onCancelReplacing}
                    onCompleted={this.onCompletedUpload}
                    onUploadError={this.onUploadError}
                    onEdit={this.toggleEditMode}
                    title={this.state.formTitle}
                    contributors={this.state.formContributors}
                    tags={this.state.formTags}
                    filename={audio.filename}
                  />
                )}
                {!audio.files && (
                  <div className="player__error">
                    Could not find an mp3 file to load the audio player with.
                    {!this.state.replacing && (
                      <button
                        className={replaceButtonClass}
                        onClick={this.onReplacing}
                      >
                        Replace audio
                      </button>
                    )}
                  </div>
                )}
                {!this.state.replacing &&
                  audio.files && (
                    <div className="row playwave__container">
                      <AudioPlayPause
                        editing={editing}
                        playing={this.state.playing}
                        handleTogglePlay={this.handleTogglePlay}
                      />
                      <div className="waveform__container">
                        <div
                          className={editing ? "audio__waveform--disabled" : ""}
                        >
                          {this.state.waveState === "loading" && (
                            <div className="audio__loading-msg">
                              loading audio...
                            </div>
                          )}
                          {this.state.waveState && (
                            <Wavesurfer
                              audioFile={`http://localhost:3000${
                                audio.files["mp3_128"]
                              }`}
                              pos={this.state.pos}
                              onPosChange={this.handlePosChange}
                              onFinish={this.handleTogglePlay}
                              onReady={() => {
                                this.setState({ waveState: "ready" });
                              }}
                              playing={this.state.playing}
                              options={waveSurferOptions}
                              ref={ref => (this.waveNode = ref)}
                            />
                          )}
                        </div>
                        <button
                          className={replaceButtonClass}
                          onClick={this.onReplacing}
                        >
                          Replace audio
                        </button>
                        <AudioUploadMessages
                          completed={this.state.completed}
                          error={this.state.uploadError}
                        />
                      </div>
                    </div>
                  )}
                <div className="row waveform__timestamp">
                  {this.state.timestamp}
                </div>
                <Metadata
                  audio={audio}
                  editing={editing}
                  contributors={this.state.formContributors}
                  validContributors={this.state.validContributors}
                  onContributorsChange={this.onContributorsChange}
                  MAX_CHAR_LENGTH={this.MAX_CHAR_LENGTH}
                  tags={this.state.formTags}
                  onTagsChange={this.onTagsChange}
                  contributorsSuggestions={this.state.contributorsSuggestions}
                />
                {audio.files && (
                  <CopyDownload audio={audio} editing={editing} />
                )}
              </div>
            </div>
            <div id="image-embed-container" className="row">
              <div className="col s10">
                <input
                  id="image-url"
                  onChange={this.updateImage}
                  placeholder="Insert Image URL here"
                  type="text"
                />
              </div>
              {audio && (
                <div className="col s10">
                  <input
                    id="embed-code"
                    readOnly
                    type="text"
                    value={`http://localhost:3000${this.updateIframeSrc(
                      audio
                    )}`}
                  />
                </div>
              )}
            </div>
          </div>
        )}
        <div id="color-pickers-container">
          {colorElements.map(colorElement => {
            const { color, element } = colorElement;

            return (
              <ColorPicker
                changeColor={this.changeColor.bind(this, element)}
                color={color}
                element={element}
                key={element}
              />
            );
          })}
        </div>
        {audio && (
          <iframe
            id="embeddable-audio-player"
            src={this.updateIframeSrc(audio)}
          />
        )}
      </div>
    );
  }
}
