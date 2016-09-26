'use strict';

const React           = require('react');
const ReactBootstrap  = require('react-bootstrap');
const Tooltip         = ReactBootstrap.Tooltip;
const OverlayTrigger  = ReactBootstrap.OverlayTrigger;
const rtcninja        = require('rtcninja');
const hark            = require('hark');
const classNames      = require('classnames');


class ConferenceParticipant extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            active: false,
            overlayVisible: false,
            audioMuted: false
        }
        this.speechEvents = null;
        this.speechActivityTimer = null;

        // ES6 classes no longer autobind
        [
            'onParticipantStateChanged',
            'onVideoClicked',
            'onMuteAudioClicked',
            'showOverlay',
            'hideOverlay'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });

        props.participant.on('stateChanged', this.onParticipantStateChanged);
    }

    componentDidMount() {
        this.maybeAttachStream();
        this.refs.videoElement.oncontextmenu = (e) => {
            // disable right click for video elements
            e.preventDefault();
        };
    }

    componentWillUnmount() {
        this.refs.videoElement.src = '';
        this.props.participant.removeListener('stateChanged', this.onParticipantStateChanged);
        if (this.speechEvents !== null) {
            this.speechEvents.stop();
            this.speechEvents = null;
        }
        clearInterval(this.speechActivityTimer);
    }

    onParticipantStateChanged(oldState, newState) {
        if (newState === 'established') {
            this.maybeAttachStream();
        }
    }

    onVideoClicked() {
        const streams = this.props.participant.streams;
        const item = {
            stream: streams.length > 0 ? streams[0] : null,
            identity: this.props.participant.identity
        };
        this.props.selected(item);
    }

    onMuteAudioClicked(event) {
        event.preventDefault();
        const streams = this.props.participant.streams;
        if (streams[0].getAudioTracks().length > 0) {
            const track = streams[0].getAudioTracks()[0];
            if(this.state.audioMuted) {
                track.enabled = true;
                this.setState({audioMuted: false});
            } else {
                track.enabled = false;
                this.setState({audioMuted: true});
            }
        }
    }

    maybeAttachStream() {
        const streams = this.props.participant.streams;
        if (streams.length > 0) {
            rtcninja.attachMediaStream(this.refs.videoElement, streams[0]);
            const options = {
                interval: 150,
                play: false
            };
            this.speechEvents = hark(streams[0], options);
            this.speechEvents.on('speaking', () => {
                this.speechActivityTimer = setInterval(() => {
                    const item = {
                        stream: streams[0],
                        identity: this.props.participant.identity
                    };
                    this.props.active(item);
                }, 500);
                this.setState({active: true});
            });
            this.speechEvents.on('stopped_speaking', () => {
                clearInterval(this.speechActivityTimer);
                this.setState({active: false});
            });
        }
    }


    showOverlay() {
        this.setState({overlayVisible: true});
    }

    hideOverlay() {
        if (!this.state.audioMuted) {
            this.setState({overlayVisible: false});
        }
    }

    render() {
        const tooltip = (
            <Tooltip id={this.props.participant.id}>{this.props.participant.identity.displayName || this.props.participant.identity.uri}</Tooltip>
        );

        const streams = this.props.participant.streams;
        const hasVideo = streams.length > 0 ? streams[0].getVideoTracks().length > 0 : false;

        const classes = classNames({
            'poster' : !hasVideo,
            'conference-active' : this.state.active
        });

        let muteButton;

        if (this.state.overlayVisible) {
            const muteButtonIcons = classNames({
                'fa'                    : true,
                'fa-microphone'         : !this.state.audioMuted,
                'fa-microphone-slash'   : this.state.audioMuted
            });

            const muteButtonClasses = classNames({
                'btn'         : true,
                'btn-round'   : true,
                'btn-default' : !this.state.audioMuted,
                'btn-warning' : this.state.audioMuted
            });

            muteButton = (
                <div className="mute">
                    <button className={muteButtonClasses} onClick={this.onMuteAudioClicked}>
                        <i className={muteButtonIcons}></i>
                    </button>
                </div>
            );
        }

        return (
            <div onMouseMove={this.showOverlay} onMouseLeave={this.hideOverlay}>
                {muteButton}
                <OverlayTrigger placement="top" overlay={tooltip}>
                        <video ref="videoElement" onClick={this.onVideoClicked} className={classes} poster="assets/images/transparent-1px.png" autoPlay />
                </OverlayTrigger>
            </div>
        );
    }
}

ConferenceParticipant.propTypes = {
    participant: React.PropTypes.object.isRequired,
    selected: React.PropTypes.func.isRequired,
    active: React.PropTypes.func.isRequired
};


module.exports = ConferenceParticipant;
