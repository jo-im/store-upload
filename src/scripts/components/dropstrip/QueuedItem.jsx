import React from 'react';

const DropstripActions = require('./dropstrip-actions');
const DropstripStore = require('./dropstrip-store');

const getStateFromStore = () => DropstripStore.getQueue();

class QueuedItem extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      title: '',
      contributor: '',
      errors: {},
      queue: getStateFromStore()
    };

    this.MAX_CHAR_LENGTH = 4;

    this._bindAllTheHandlers([
      'onChange',
      'onPause',
      'onResume',
      'onCancel',
      'onCancelConfirmed',
      'onUpload',
      'onSuccessOrFailure'
    ]);
  }

  componentDidMount() {
    DropstripStore.addChangeListener(this.onChange);
    DropstripStore.addChangeListener(this.onSuccessOrFailure);
  }

  componentWillUnmount() {
    DropstripStore.removeChangeListener(this.onChange);
    DropstripStore.removeChangeListener(this.onSuccessOrFailure);
  }

  onChange(e) {
    let newState = {
      errors: this.state.errors
    };
    if (e === 'success' || e === 'failed') {
      this.onSuccessOrFailure();
      return;
    }
    if (e && e.target) {
      //  change event is triggered by filling out the form
      const fieldName = e.target.name;
      newState[fieldName] = e.target.value;
      if (e.target.value.length > 0 && (e.target.value.length < this.MAX_CHAR_LENGTH)) {
        newState.errors[fieldName] = true;
      } else {
        delete newState.errors[fieldName];
      }
    }
    newState = Object.assign(this.state, newState);
    this.setState(newState);
  }

  onSuccessOrFailure() {
    const queue = getStateFromStore();
    this.setState(queue);
  }

  onPause() {
    DropstripActions.pauseUpload(this.props.file.name);
    this.setState({
      progress: 'paused'
    });
  }

  onResume() {
    DropstripActions.resumeUpload(this.props.file.name);
    this.setState({
      progress: 'uploading'
    });
  }

  onCancel(e) {
    e.stopPropagation();
    if (this.state.progress === 'uploading' || this.state.progress === 'paused') {
      DropstripActions.pauseUpload(this.props.file.name);
    }
    this.setState({
      previousState: this.state.progress,
      progress: 'canceling'
    });
  }

  onCancelConfirmed(yesCancel) {
    if (yesCancel) {
      DropstripActions.removeFile(this.props.file);
    } else {
      this.setState({
        progress: this.state.previousState
      });
    }
  }

  onOverwrite(yesNo) {
    if (yesNo) {
      DropstripActions.overwriteFile(this.props.file.name);
    } else {
      this.onCancelConfirmed(true);
    }
  }

  onUpload(e) {
    e.preventDefault();
    DropstripActions.uploadFile({
      file: this.props.file,
      title: this.state.title,
      contributor: this.state.contributor
    });
    this.setState({
      progress: 'uploading'
    });
  }

  _bindAllTheHandlers(arr) {
    arr.forEach((thing) => {
      this[thing] = this[thing].bind(this);
    });
  }

  render() {
    const form = this.state;
    const dropzoneQueue = this.state.queue;
    const file = this.props.file;
    const fileSize = Math.round(file.size / 10000) / 100;
    const fileStatus = dropzoneQueue[file.name].status;
    const hideTitleAlert = form.errors.title ? '' : 'hidden';
    const hideContributorAlert = form.errors.contributor ? '' : 'hidden';
    const hasErrors = (!form.title || !form.contributor) ||
      form.errors.title || form.errors.contributor;
    const progressBarStyle = {
      width: `${fileStatus.progress}%`
    };
    const completed = this.state.queue[file.name].completed;
    const failed = this.state.queue[file.name].failed;
    return (
      <div className="queued-item" onClick={e => e.stopPropagation()}>
        <button className={this.state.progress === 'canceling' || fileStatus.exists ? 'hidden' : 'cancel'} onClick={this.onCancel}>
          <img src="/assets/images/button-remove.png" />
        </button>
        <form onSubmit={this.onUpload} className={this.state.progress || fileStatus.exists ? 'hidden' : ''}>
          <div className="dz-details">
            <div className="dz-filename">{file.name}</div>
            <div className="row">
              <label htmlFor="title">Title</label>
              <input
                className="title"
                type="text"
                name="title"
                placeholder="What is this file about?"
                value={form.title}
                onChange={this.onChange}
              />
              <div className={`alert ${hideTitleAlert}`}>
                You must provide a title (min {this.MAX_CHAR_LENGTH} chars).
              </div>
            </div>
            <div className="row">
              <label htmlFor="contributor">Contributor</label>
              <input
                type="text"
                className="contributor"
                name="contributor"
                placeholder="Who made this? (Separate 2+ names with commas)"
                onChange={this.onChange}
              />
              <div className={`alert ${hideContributorAlert}`}>
                You must provide a contributor name (min {this.MAX_CHAR_LENGTH} chars).
              </div>
            </div>
            <div className="children-right">
              <button type="submit" className="action-btn btn upload-button" disabled={hasErrors}>
                Upload this file
              </button>
            </div>
          </div>
        </form>
        <div
          className={this.state.progress === 'uploading' && !completed && !failed ? 'uploading-container' : 'hidden'}
        >
          <div className="file-title">{form.title}</div>
          <div className="progress-wrapper">
            <button className="upload-pause" onClick={this.onPause}>
              <img src="/assets/images/button-pause_upload.png" alt="Pause Upload" />
            </button>
            <div className="progress" style={progressBarStyle}>
              Loading ({fileStatus.progress}%)
            </div>
          </div>
        </div>
        <div className={this.state.progress === 'paused' ? 'paused-container' : 'hidden'}>
          <div className="file-title">{form.title}</div>
          <div className="progress-wrapper paused">
            <button className="upload-pause resume" onClick={this.onResume}>
              <img src="/assets/images/button-resume_upload.png" alt="Resume Upload" />
            </button>
            <div className="progress" style={progressBarStyle}>
              Paused at {fileStatus.progress}%
            </div>
          </div>
        </div>
        <div className={this.state.progress === 'canceling' ? 'queued-item__prompt__centered' : 'hidden'}>
          <div className="prompt">
            Are you sure you want to remove this file?
          </div>
          <div className="file-title">{file.name}</div>
          <a className="btn yes" onClick={() => this.onCancelConfirmed(true)}>Yes</a>
          <a className="btn no" onClick={() => this.onCancelConfirmed(false)}>No</a>
        </div>
        <div
          className={completed && this.state.progress !== 'canceling' ? 'completed-container success-container' : 'hidden'}
        >
          <div className="file-title">
            <img src="/assets/images/indicator-success.png" className="indicator" />
            {form.title}
          </div>
          <div className="row">
            <div className="col s6 details">{file.duration} | {fileSize}MB</div>
            <div className="col s6 edit">
              <a>Edit this file</a>
            </div>
          </div>
        </div>
        <div
          className={failed && this.state.progress !== 'canceling' ? 'completed-container failed-container' : 'hidden'}
        >
          <div className="file-title">
            <img src="/assets/images/indicator-failure.png" className="indicator" />
            {form.title}
          </div>
          <div className="upload-failed">
            <div className="msg">upload failed</div>
          </div>
          <div className="children-right">
            <div className="action-btn btn" onClick={this.onResume}>
              Try again
          </div>
          </div>
        </div>
        <div className={fileStatus.exists ? 'queued-item__prompt__centered' : 'hidden'}>
          <div className="prompt">
            A file already exists by that name. Do you want to overwrite it?
          </div>
          <br />
          <div className="file-title">{file.name}</div>
          <a className="btn yes" onClick={() => this.onOverwrite(true)}>Yes</a>
          <a className="btn no" onClick={() => this.onOverwrite(false)}>No</a>
        </div>
      </div>
    );
  }
}

module.exports = QueuedItem;
