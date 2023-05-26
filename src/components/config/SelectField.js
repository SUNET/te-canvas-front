import React from "react";

import { Button, Select, Spinner } from "@instructure/ui";

import { parseResponse, urlParams } from "../../util";

class SelectField extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: true,
            options: [],
            isShowingOptions: false,
            highlightedOptionId: null,
            selectedOptionId: null
        };
        this.refresh = this.refresh.bind(this);
        this.handleShowOptions = this.handleShowOptions.bind(this);
        this.handleHideOptions = this.handleHideOptions.bind(this);
        this.handleHighlightOption = this.handleHighlightOption.bind(this);
        this.handleSelectOption = this.handleSelectOption.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    componentDidMount() {
        if (this.props.type !== null) this.refresh();
    }

    componentDidUpdate(prevProps) {
        if (this.props.type !== prevProps.type) {
            this.setState({ isLoading: true });
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
                    options: json.filter(
                        field =>
                            !this.props.existingFields.includes(field.extid)
                    ),
                    isLoading: false,
                    inputValue: json[0].name,
                    selectedOptionId: json[0].extid
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
            highlightedOption: null
        });
    }

    handleBlur() {
        this.setState({ highlightedOption: null });
    }

    handleHighlightOption(event, { id }) {
        event.persist();
        this.setState({
            selectedOptionId: id,
            highlightedOptionId: id,
            inputValue: this.state.options.find(o => o.extid === id).name
        });
    }

    handleSelectOption(_, { id }) {
        this.setState({
            selectedOptionId: id,
            inputValue: this.state.options.find(o => o.extid === id).name,
            isShowingOptions: false
        });
    }

    handleSubmit() {
        if (
            this.state.options.some(
                o => o.extid === this.state.selectedOptionId
            )
        ) {
            this.props.onSubmit(this.state.selectedOptionId);
        }
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
                                options.map(({ extid, name }) => {
                                    return (
                                        <Select.Option
                                            id={extid}
                                            key={extid}
                                            value={extid}
                                            isHighlighted={
                                                extid === highlightedOptionId
                                            }
                                            isSelected={
                                                extid === selectedOptionId
                                            }
                                        >
                                            {name}
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
                            <Button margin="small" onClick={this.handleSubmit}>
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

export default SelectField;
