import React from "react";

import { Heading, InstUISettingsProvider, Tabs, canvas } from "@instructure/ui";

import "../style.css";
import { urlParams } from "../util";
import Feedback from "./Feedback";
import Sync from "./Sync";
import Config from "./config/Config";
import WhitelistTypes from "./config/WhitelistTypes";

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
                            renderTitle="Course Event Template"
                            isSelected={this.state.activeTab === 1}
                        >
                            <Config default={false} />
                        </Tabs.Panel>
                        <Tabs.Panel
                            renderTitle="Default Event Template"
                            isSelected={this.state.activeTab === 2}
                        >
                            <Config default={true} />
                        </Tabs.Panel>
                        <Tabs.Panel
                            renderTitle="Whitelist types"
                            isSelected={this.state.activeTab === 3}
                        >
                            <WhitelistTypes />
                        </Tabs.Panel>
                    </Tabs>
                </div>
            </InstUISettingsProvider>
        );
    }
}

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
                // MAGIC STRING ALERT: Is replaced on serverside with actual canvas_group.
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
                if (status.group.length < 3 && !this.state.groupError)
                    this.setState({ groupError: true });
                if (status.group.length === 3 && this.state.groupError)
                    this.setState({ groupError: false });
                if (status.default.length < 3 && !this.state.defaultError)
                    this.setState({ defaultError: true });
                if (status.default.length === 3 && this.state.defaultError)
                    this.setState({ defaultError: false });
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
                        message="No valid Event Template for course, using default configuration."
                    />
                )}
            </>
        );
    }
}

export default App;
