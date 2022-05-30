import React from "react";

import { Heading, InstUISettingsProvider, Tabs, canvas } from "@instructure/ui";

import "../style.css";
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
                    <TemplateErrorFeedback />
                </div>
            </InstUISettingsProvider>
        );
    }
}

// Check `/config/ok` at an interval of 1 second and display a warning message
// if the template config is incomplete.
class TemplateErrorFeedback extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            templateError: false
        };
        this.refresh = this.refresh.bind(this);
    }

    componentDidMount() {
        this.refresh();
        this.interval = setInterval(this.refresh, 1000);
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    refresh() {
        fetch(window.injectedEnv.BACKEND_URL + "/api/config/ok")
            .then(resp => {
                if (resp.status !== 200)
                    throw new Error(
                        `Unexpected HTTP response from /api/config/ok: ${resp.status}`
                    );
                return resp.text();
            })
            .then(text => {
                if (text === "True") this.setState({ templateError: false });
                else if (text === "False")
                    this.setState({ templateError: true });
                else
                    throw new Error(
                        `Unexpected text response from /api/config/ok: ${text}`
                    );
            })
            .catch(e => console.error(e));
    }

    render() {
        return (
            this.state.templateError && (
                <Feedback message="Syncing is suspended due to incomplete Event Template." />
            )
        );
    }
}

export default App;
