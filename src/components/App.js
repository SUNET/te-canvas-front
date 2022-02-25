import React from "react";
import { parseResponse, MyContext, urlParams } from "../util";

import {
    Alert,
    Button,
    Heading,
    InstUISettingsProvider,
    SimpleSelect,
    View,
    canvas
} from "@instructure/ui";

import { IconTrashLine, IconPlusLine } from "@instructure/ui-icons";

import AsyncSelect from "./AsyncSelect";

import "../style.css";

// This will later be based on LTI info
const CANVAS_GROUP = "168";

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            searchObjects: {},
            feedbackMessage: null
        };

        this.refresh = this.refresh.bind(this);
        this.feedback = this.feedback.bind(this);
    }

    componentDidMount() {
        this.refresh();
    }

    refresh() {
        // This outer fetch gets a list of connections on the form
        // { canvas_group: <id>, te_group: <id>, delete_flag: <bool> }
        fetch(
            urlParams(process.env.TE_CANVAS_URL, "/api/connection", {
                canvas_group: CANVAS_GROUP
            })
        )
            .then(resp => {
                if (resp.status !== 200)
                    throw new Error(
                        `Unexpected HTTP response from backend: ${resp.status}`
                    );
                return resp.json();
            })
            .then(json => {
                return json;
            })
            .then(connections => {
                // We then go through each connection and start an asynchronous
                // fetch to get TimeEdit details for each connection. This fills
                // out state.searchObjects and allows us to present the search
                // objects in a user-friendly format.

                let promises = [];

                connections
                    .filter(c => !c.delete_flag)
                    .forEach(c => {
                        let details = fetch(
                            urlParams(
                                process.env.TE_CANVAS_URL,
                                "/api/timeedit/object",
                                {
                                    extid: c.te_group
                                }
                            )
                        )
                            .then(resp => {
                                if (resp.status !== 200)
                                    throw new Error(
                                        `Unexpected HTTP response from backend: ${resp.status} ${resp.statusText}`
                                    );
                                return resp.json();
                            })
                            .then(data => ({
                                extid: data.extid,
                                type: data["type.name"],
                                id: data["general.id"],
                                title: data["general.title"]
                            }))
                            .catch(e => {
                                // This will lead Promise.all to also reject at
                                // (1), which is caught at (2).
                                return Promise.reject(e);
                            });
                        promises.push(details);
                    });

                return Promise.all(promises); // (1)
            })
            .then(searchObjects => {
                this.setState({
                    searchObjects: searchObjects
                });
            })
            .catch(e => console.error(e)); // (2)
    }

    feedback(message) {
        this.setState({
            feedbackMessage: message
        });
        setTimeout(() => this.setState({ feedbackMessage: null }), 1500);
    }

    render() {
        return (
            <MyContext.Provider
                value={{
                    refresh: this.refresh,
                    feedback: this.feedback,
                }}
            >
                <InstUISettingsProvider theme={canvas}>
                    <div id="main">
                        <SearchObjects
                            refresh={this.refresh}
                            searchObjects={this.state.searchObjects}
                        />
                        <AddNew />
                        <Feedback message={this.state.feedbackMessage} />
                    </div>
                </InstUISettingsProvider>
            </MyContext.Provider>
        );
    }
}

class Feedback extends React.Component {
    render() {
        return this.props.message ? (
            <Alert variant="error" margin="small">
                {this.props.message}
            </Alert>
        ) : null;
    }
}

class SearchObjects extends React.Component {
    render() {
        return (
            <>
                <Heading border="bottom">TimeEdit Sync</Heading>
                {Object.entries(this.props.searchObjects).map(([k, v]) => (
                    <SearchObject key={k} {...v} />
                ))}
            </>
        );
    }
}

class SearchObject extends React.Component {
    constructor(props) {
        super(props);
        this.delete = this.delete.bind(this);
    }

    static contextType = MyContext; // Telling React that I want to use the context provider I have defined

    delete(id) {
        fetch(
            urlParams(process.env.TE_CANVAS_URL, "/api/connection", {
                te_group: id,
                canvas_group: CANVAS_GROUP
            }),
            {
                method: "DELETE"
            }
        )
            .then(resp => {
                // We only want to check for response code 204. Response 409 (where a
                // connection has delete_flag set but has not been deleted yet) is not
                // relevant since connections with delete_flag set are not shown.
                if (resp.status !== 204)
                    throw new Error(
                        `Unexpected HTTP response from backend: ${resp.status} ${resp.statusText}`
                    );
                this.context.refresh();
            })
            .catch(e => console.error(e));
    }

    render() {
        return (
            <View
                display="block"
                borderRadius="medium"
                borderWidth="small"
                background="secondary"
                padding="medium"
                margin="small"
            >
                <div
                    className="search-object"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                >
                    <div>{this.props.type}</div>
                    <div>{this.props.title}</div>
                    <div>{this.props.id}</div>
                    <Button
                        renderIcon={IconTrashLine}
                        onClick={() => this.delete(this.props.extid)}
                    >
                        Remove
                    </Button>
                </div>
            </View>
        );
    }
}

class AddNew extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            active: false
        };
        this.setActive = this.setActive.bind(this);
    }

    setActive(b) {
        this.setState({
            active: b
        });
    }

    render() {
        return this.state.active ? (
            <AddNewForm setActive={this.setActive} />
        ) : (
            <Button
                renderIcon={IconPlusLine}
                margin="small"
                onClick={() => this.setActive(true)}
            >
                Add Object
            </Button>
        );
    }
}

class AddNewForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            type: null,
            types: [],
            object: null
        };
        this.handleSelect = this.handleSelect.bind(this);
        this.submit = this.submit.bind(this);
        this.setObject = this.setObject.bind(this);
    }

    static contextType = MyContext;

    componentDidMount() {
        let promise = fetch(
            urlParams(process.env.TE_CANVAS_URL, "/api/timeedit/types", {
            })
        );
        parseResponse(promise, json => {
            this.setState({
                types: Object.entries(json).map(([k, v]) => ({
                    extid: k,
                    title: v
                })),
                // If the types include "courseevt" we set this as active.
                // Otherwise just pick the first type.
                type: Object.keys(json).some(x => x === "courseevt")
                    ? "courseevt"
                    : Object.keys(json)[0]
            });
        });
    }

    handleSelect(key) {
        return (_, { value }) => {
            this.setState({ [key]: value });
        };
    }

    submit() {
        fetch(
            urlParams(process.env.TE_CANVAS_URL, "/api/connection", {
                te_group: this.state.object,
                canvas_group: CANVAS_GROUP
            }),
            {
                method: "POST"
            } // TODO: Does not work with "Content-Type" header added (CORS)
        )
            .then(resp => {
                switch (resp.status) {
                    case 204: // Success, no content
                        // We don't adjust the state manually, instead we fetch a new
                        // state from the server. Since we wait for the POST fetch
                        // to complete, we know that the following GET will include our
                        // new connection.
                        this.context.refresh();
                        this.props.setActive(false);
                        break;
                    case 409: // Conflict, already exists
                        // TODO: Maybe another case for when there is a
                        // connection but its delete_flag is set, like on the
                        // delete endpoint. I.e. if someone deletes and re-adds
                        // a connection quickly.
                        this.context.feedback("Connection already exists");
                        break;
                    default:
                        throw new Error(
                            `Unexpected HTTP response from backend: ${resp.status} ${resp.statusText}`
                        );
                }
            })
            .catch(e => console.error(e));
    }

    setObject(object) {
        this.setState({
            object: object
        });
    }

    render() {
        return (
            <View
                display="block"
                borderRadius="medium"
                borderWidth="small"
                background="secondary"
                padding="medium"
                margin="small"
            >
                <SimpleSelect
                    renderLabel="Object Type"
                    value={this.state.type}
                    onChange={this.handleSelect("type")}
                >
                    {this.state.types.map(t => (
                        <SimpleSelect.Option
                            key={t.extid}
                            id={t.extid}
                            value={t.extid}
                        >
                            {t.title}
                        </SimpleSelect.Option>
                    ))}
                </SimpleSelect>
                <br />
                <AsyncSelect
                    type={this.state.type}
                    setObject={this.setObject}
                />
                <br />
                <Button onClick={this.submit}>Submit</Button>{" "}
                <Button onClick={() => this.props.setActive(false)}>
                    Cancel
                </Button>
            </View>
        );
    }
}

export default App;