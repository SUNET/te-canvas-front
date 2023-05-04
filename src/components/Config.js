import React from "react";

import {
    Button,
    Grid,
    Heading,
    IconPlusLine,
    IconTrashLine,
    Select,
    SimpleSelect,
    Spinner,
    View
} from "@instructure/ui";

import { parseResponse, urlParams } from "../util";

class Config extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            title: [],
            location: [],
            description: []
        };
        this.handleDelete = this.handleDelete.bind(this);
    }

    componentDidMount() {
        fetch(urlParams(window.injectedEnv.API_URL, "/api/config/template"))
            .then(resp => {
                if (resp.status !== 200)
                    throw new Error(
                        `Unexpected HTTP response from backend: ${resp.status}`
                    );
                return resp.json();
            })
            .then(data => this.setState(data));
    }

    handleDelete(id) {
        fetch(
            urlParams(window.injectedEnv.API_URL, "/api/config/template", {
                id: id
            }),
            { method: "DELETE" }
        ).then(resp => {
            if (resp.status !== 204)
                throw new Error(
                    `Unexpected HTTP response from backend: ${resp.status}`
                );
            this.setState({
                title: this.state.title.filter(n => n.id !== id),
                location: this.state.location.filter(n => n.id !== id),
                description: this.state.description.filter(n => n.id !== id)
            });
        });
    }

    render() {
        return (
            <div id="config">
                <ConfigSection
                    name="title"
                    children={this.state.title}
                    onDelete={this.handleDelete}
                />
                <ConfigSection
                    name="location"
                    children={this.state.location}
                    onDelete={this.handleDelete}
                />
                <ConfigSection
                    name="description"
                    children={this.state.description}
                    onDelete={this.handleDelete}
                />
            </div>
        );
    }
}

export default Config;

class ConfigSection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            addNew: false
        };
        this.handleCancel = this.handleCancel.bind(this);
    }

    handleCancel() {
        this.setState({
            addNew: false
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
                <Heading level="h2">
                    {this.props.name.charAt(0).toUpperCase()}
                    {this.props.name.slice(1)}
                </Heading>
                <div>
                    {!this.state.addNew && (
                        <Button
                            renderIcon={IconPlusLine}
                            margin="small"
                            color="primary"
                            onClick={() =>
                                this.setState({
                                    addNew: !this.state.addNew
                                })
                            }
                        >
                            Add {this.props.name} field
                        </Button>
                    )}
                </div>
                {this.state.addNew && (
                    <AddNewField
                        name={this.props.name}
                        onCancel={this.handleCancel}
                    />
                )}
                {this.props.children &&
                    this.props.children.map(c => (
                        <div key={c.id} style={{ marginBottom: 10 }}>
                            <Button
                                onClick={() => this.props.onDelete(c.id)}
                                renderIcon={IconTrashLine}
                            >
                                <strong>{c.te_type}</strong>-{c.te_field}
                            </Button>
                        </div>
                    ))}
            </View>
        );
    }
}

class AddNewField extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            types: [],
            type: null,
            isLoading: true
        };
        this.handleSelect = this.handleSelect.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    componentDidMount() {
        let promise = fetch(
            urlParams(window.injectedEnv.API_URL, "/api/timeedit/types", {})
        );
        parseResponse(promise, json => {
            this.setState({
                types: Object.entries(json).map(([k, v]) => ({
                    extid: k,
                    title: v
                })),
                type: Object.keys(json).some(x => x === "courseevt")
                    ? "courseevt"
                    : Object.keys(json)[0],
                isLoading: false
            });
        });
    }

    handleSelect(key) {
        return (_, { value }) => {
            this.setState({ [key]: value });
        };
    }

    handleSubmit() {
        fetch(
            urlParams(window.injectedEnv.API_URL, "/api/config/template", {
                name: this.props.name,
                te_type: this.state.type,
                te_fields: this.state.type
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
                    case 404: // Already exists
                    case 409:
                        resp.json().then(json =>
                            this.context.feedback(json.message)
                        );
                        break;
                    default:
                        throw new Error(
                            `Unexpected HTTP response from backend: ${resp.status} ${resp.statusText}`
                        );
                }
            })
            .catch(e => console.error(e));
    }

    render() {
        const { isLoading } = this.state;

        return (
            <>
                {!isLoading ? (
                    <>
                        <div style={{ marginBottom: 10 }}>
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
                        </div>
                        <div margin={{ marginBottom: 10 }}>
                            <SelectField
                                type={this.state.type}
                                onCancel={this.props.onCancel}
                                onSubmit={this.handleSubmit}
                            />
                        </div>
                    </>
                ) : (
                    <Spinner renderTitle="Loading" />
                )}
            </>
        );
    }
}

class SelectField extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: true,
            options: [],
            isShowingOptions: false,
            highlightedOptionId: null,
            selectedOption: null
        };
        this.refresh = this.refresh.bind(this);
        this.handleShowOptions = this.handleShowOptions.bind(this);
        this.handleHideOptions = this.handleHideOptions.bind(this);
        this.handleHighlightOption = this.handleHighlightOption.bind(this);
        this.handleSelectOption = this.handleSelectOption.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
    }

    componentDidMount() {
        if (this.props.type !== null) this.refresh();
        console.log("refreshing te fields");
    }

    componentDidUpdate(prevProps) {
        if (this.props.type !== prevProps.type) {
            this.setState({ isLoading: true });
            console.log("refreshing te fields");
            this.refresh();
        }
    }
    refresh() {
        parseResponse(
            fetch(
                urlParams(window.injectedEnv.API_URL, "/api/timeedit/fields", {
                    extid: this.props.type
                })
            ),
            json => {
                this.setState({
                    options: json,
                    isLoading: false,
                    inputValue: json[0]
                });
            }
        );
    }

    handleShowOptions() {
        this.setState({
            isShowingOptions: true
        });
    }

    handleHideOptions() {
        this.setState({
            isShowingOptions: false,
            highlightedOptionId: null
        });
    }

    handleBlur() {
        this.setState({ highlightedOptionId: null });
    }

    handleHighlightOption(event, { id }) {
        event.persist();
        this.setState({
            selectedOptionId: id,
            highlightedOptionId: id,
            inputValue: id
        });
    }

    handleSelectOption(_, { id }) {
        this.setState({
            selectedOptionId: id,
            inputValue: id,
            isShowingOptions: false
        });
        // this.props.setField(id);
        console.log("setField", id);
    }

    render() {
        const {
            isLoading,
            options,
            inputValue,
            isShowingOptions,
            highlightedOptionId,
            selectedOptionId
        } = this.state;

        return (
            <>
                {isLoading ? (
                    <Spinner renderTitle="Loading" />
                ) : (
                    <>
                        <Select
                            renderLabel="Object Field"
                            inputValue={inputValue}
                            isShowingOptions={isShowingOptions}
                            onBlur={this.handleBlur}
                            onRequestShowOptions={this.handleShowOptions}
                            onRequestHideOptions={this.handleHideOptions}
                            onRequestHighlightOption={
                                this.handleHighlightOption
                            }
                            onRequestSelectOption={this.handleSelectOption}
                        >
                            {options.length > 0 ? (
                                options.map(field => {
                                    return (
                                        <Select.Option
                                            id={field}
                                            key={field}
                                            value={field}
                                            isHighlighted={
                                                field === highlightedOptionId
                                            }
                                            isSelected={
                                                field === selectedOptionId
                                            }
                                        >
                                            {field}
                                        </Select.Option>
                                    );
                                })
                            ) : (
                                <Select.Option
                                    id="empty-option"
                                    key="empty-option"
                                ></Select.Option>
                            )}
                        </Select>
                        <div style={{ marginBottom: 10 }}>
                            <Button
                                margin="small"
                                onClick={this.props.onSubmit}
                            >
                                Submit
                            </Button>
                            <Button onClick={this.props.onCancel}>
                                Cancel
                            </Button>
                        </div>
                    </>
                )}
            </>
        );
    }
}
