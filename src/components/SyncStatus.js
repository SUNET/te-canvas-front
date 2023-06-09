import React from "react";

import { urlParams } from "../util";
import Feedback from "./Feedback";

class SyncStatus extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            status: null
        };
        this.refresh = this.refresh.bind(this);
    }

    componentDidMount() {
        this.refresh();
        this.interval = setInterval(this.refresh, 5000);
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    refresh() {
        fetch(
            urlParams(window.injectedEnv.API_URL, "/api/connection/status", {
                // MAGIC STRING ALERT: Is replaced on serverside with actual canvas_group.
                canvas_group: "LTI_CUSTOM_PROPERTY"
            })
        )
            .then(resp => {
                if (resp.status !== 200) {
                    throw new Error(
                        `Unexpected HTTP response from backend: ${resp.status}`
                    );
                }
                return resp.json();
            })
            .then(json => {
                this.setState({ status: json });
            })
            .catch(e => console.error(e));
    }

    render() {
        return (
            <>
                {this.props.connections > 0 &&
                    this.state.status === "success" && (
                        <Feedback
                            variant="success"
                            message="Sync completed"
                            close
                        />
                    )}
                {this.props.connections > 0 &&
                    this.state.status === "in_progress" && (
                        <Feedback
                            variant="warning"
                            message="Sync in progress"
                            close
                        />
                    )}
                {this.props.connections > 0 &&
                    this.state.status === "error" && (
                        <Feedback variant="error" message="Sync error" close />
                    )}
            </>
        );
    }
}

export default SyncStatus;
