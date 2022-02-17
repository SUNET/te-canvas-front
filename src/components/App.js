import React from "react";

import {
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

let MyContext = React.createContext();

function parseResponse(fetchPromise, jsonCallback) {
    fetchPromise
        .then(resp => {
            if (resp.status !== 200)
                throw new Error(
                    `Unexpected HTTP response from backend: ${resp.status} ${resp.statusText}`
                );
            return resp.json();
        })
        .then(jsonCallback)
        .catch(e => console.error(e));
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            searchObjects: {}
        };
        this.refresh = this.refresh.bind(this);
    }

    componentDidMount() {
        this.refresh();
    }

    refresh() {
        // Arrow function callbacks mandatory for binding of `this`
        let promise = fetch(process.env.TE_CANVAS_URL + "/api/connection");
        parseResponse(promise, json => {
            json.data
                .filter(x => !x.delete_flag)
                .forEach(x => {
                    let promise = fetch(
                        process.env.TE_CANVAS_URL +
                            `/api/timeedit/object?extid=${x.te_group}`
                    );
                    parseResponse(promise, json => {
                        this.setState(prevState => ({
                            searchObjects: {
                                ...prevState.searchObjects,
                                [json.data.extid]: {
                                    extid: json.data.extid,
                                    type: json.data["type.name"],
                                    id: json.data["general.id"],
                                    title: json.data["general.title"]
                                }
                            }
                        }));
                    });
                });
        });
    }

    render() {
        return (
            <MyContext.Provider value={{ refresh: this.refresh }}>
                <InstUISettingsProvider theme={canvas}>
                    <div id="main">
                        <SearchObjects
                            refresh={this.refresh}
                            searchObjects={this.state.searchObjects}
                        />
                        <AddNew />
                    </div>
                </InstUISettingsProvider>
            </MyContext.Provider>
        );
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
        let promise = fetch(
            process.env.TE_CANVAS_URL +
                `/api/connection?te_group=${id}&canvas_group=EXAMPLE`,
            {
                method: "DELETE"
            }
        );
        parseResponse(promise, json => {
            this.context.refresh();
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
                        onClick={() => this.delete(this.props.id)}
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
        let promise = fetch(process.env.TE_CANVAS_URL + "/api/timeedit/types");
        parseResponse(promise, json => {
            console.log(json);
            this.setState({
                types: Object.entries(json.data).map(([k, v]) => ({
                    extid: k,
                    title: v
                })),
                type: Object.keys(json.data).some(x => x === "courseevt")
                    ? "courseevt"
                    : Object.keys(json.data)[0]
            });
        });
    }

    handleSelect(key) {
        return (_, { value }) => {
            this.setState({ [key]: value });
        };
    }

    submit() {
        let promise = fetch(
            process.env.TE_CANVAS_URL +
                `/api/connection?te_group=${this.state.object}&canvas_group=EXAMPLE`,
            {
                method: "POST"
            } // TODO: Does not work with "Content-Type" header added (CORS)
        );
        parseResponse(promise, json => {
            console.log(json); // TODO: Should we give feedback?
            this.props.setActive(false);
            this.context.refresh();
        });
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
                        <SimpleSelect.Option key={t.extid} id={t.extid} value={t.extid}>
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
