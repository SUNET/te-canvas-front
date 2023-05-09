import React from "react";

import { Heading, InstUISettingsProvider, Tabs, canvas } from "@instructure/ui";

import "../style.css";
import { urlParams } from "../util";
import Config from "./Config";
import Feedback from "./Feedback";
import Sync from "./Sync";

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: 0
        };
        this.handleTabChange = this.handleTabChange.bind(this);
    }

    handleTabChange(_, { index }) {
        this.setState({
            activeTab: index
        });
    }

    render() {
        return (
            <InstUISettingsProvider theme={canvas}>
                <div id="main">
                    <Heading border="bottom">TimeEdit Sync</Heading>
                    <TemplateStatusFeedback />
                    <Tabs
                        variant="secondary"
                        onRequestTabChange={this.handleTabChange}
                    >
                        <Tabs.Panel
                            renderTitle="Sync Objects"
                            isSelected={this.state.activeTab === 0}
                        >
                            <Sync />
                        </Tabs.Panel>
                        <Tabs.Panel
                            renderTitle="Event Template"
                            isSelected={this.state.activeTab === 1}
                        >
                            <Config />
                        </Tabs.Panel>
                    </Tabs>
                </div>
            </InstUISettingsProvider>
        );
    }
}

//Check `/config/ok` at an interval of 1 second and display a warning message
//if the template config is incomplete.
class TemplateStatusFeedback extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            defaultError: false,
            groupError: false
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
            urlParams(window.injectedEnv.API_URL, "/api/config/ok", {
                canvas_group: "LTI_CUSTOM_PROPERTY"
            })
        )
            .then(resp => {
                if (resp.status !== 200)
                    throw new Error(
                        `Unexpected HTTP response from /api/config/ok: ${resp.status}`
                    );
                return resp.json();
            })
            .then(status => {
                if (status.group.length < 3)
                    this.setState({ groupError: true });
                if (status.default.length < 3)
                    this.setState({ defaultError: true });
            })
            .catch(e => console.error(e));
    }

    render() {
        return (
            <>
                {this.state.groupError && this.state.defaultError && (
                    <Feedback
                        variant="error"
                        message="Syncing is suspended due to missing Event Template."
                    />
                )}
                {this.state.groupError && !this.state.defaultError && (
                    <Feedback
                        variant="info"
                        message="No Event Template for group, using default configuration."
                    />
                )}
            </>
        );
    }
}

export default App;
