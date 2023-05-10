import React from "react";

import { SimpleSelect, Spinner } from "@instructure/ui";

import { parseResponse, urlParams } from "../../util";
import SelectField from "./SelectField";

class AddFieldForm extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            types: [],
            type: null,
            isLoading: true
        };
        this.handleSelect = this.handleSelect.bind(this);
        this.refresh = this.refresh.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    componentDidMount() {
        this.refresh();
    }

    refresh() {
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

    handleSubmit(field) {
        this.props.onSubmit(this.state.type, field);
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
                                existingFields={this.props.existingFields}
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

export default AddFieldForm;
