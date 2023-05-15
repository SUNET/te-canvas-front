import React from "react";

import { Select, Spinner } from "@instructure/ui";

import { createField, parseResponse, urlParams } from "../util";

// TODO: Refactor to solve this in backend.
const TE_ID_FIELDS = ["general.id", "general.id_ref"];
const TE_TITLE_FIELDS = ["general.title", "general.title_ref"];

let initState = {
    inputValue: "",
    isShowingOptions: false,
    isLoading: false,
    highlightedOptionId: null,
    selectedOptionId: null,
    selectedOptionLabel: "",
    options: []
};

class AsyncSelect extends React.Component {
    constructor(props) {
        super(props);
        this.state = initState;

        this.refresh = this.refresh.bind(this);
        this.getOptionById = this.getOptionById.bind(this);
        this.matchValue = this.matchValue.bind(this);
        this.handleShowOptions = this.handleShowOptions.bind(this);
        this.handleHideOptions = this.handleHideOptions.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleHighlightOption = this.handleHighlightOption.bind(this);
        this.handleSelectOption = this.handleSelectOption.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.createLabel = this.createLabel.bind(this);
    }

    componentDidUpdate(prevProps) {
        if (this.props.type !== prevProps.type) {
            this.setState(initState, () => this.refresh(null));
        }
    }

    refresh(search_string) {
        parseResponse(
            fetch(
                urlParams(window.injectedEnv.API_URL, "/api/timeedit/objects", {
                    type: this.props.type,
                    number_of_objects: 10,
                    ...(search_string === null
                        ? {}
                        : { search_string: search_string })
                })
            ),
            json => {
                this.setState({
                    options: json.map(te_object => ({
                        id: te_object.extid,
                        label: this.createLabel(te_object)
                    })),
                    isLoading: false
                });
            }
        );
    }

    createLabel(te_object) {
        const label = [];
        for (const field of TE_ID_FIELDS.concat(TE_TITLE_FIELDS)) {
            console.log("field: %s", field);
            if (te_object.hasOwnProperty(field)) label.push(te_object[field]);
        }
        return label.join(" - ");
    }

    getOptionById(queryId) {
        return this.state.options.find(({ id }) => id === queryId);
    }

    matchValue() {
        const { options, inputValue, selectedOptionId, selectedOptionLabel } =
            this.state;

        // an option matching user input exists
        if (options.length === 1) {
            const onlyOption = options[0];
            // automatically select the matching option
            if (onlyOption.label.toLowerCase() === inputValue.toLowerCase()) {
                return {
                    inputValue: onlyOption.label,
                    selectedOptionId: onlyOption.id
                };
            }
        }
        // allow user to return to empty input and no selection
        if (inputValue === "") {
            return { selectedOptionId: null };
        }
        // no match found, return selected option label to input
        if (selectedOptionId) {
            return { inputValue: selectedOptionLabel };
        }
    }

    handleShowOptions() {
        this.setState({
            isShowingOptions: true
        });
    }

    handleHideOptions() {
        this.setState({
            isShowingOptions: false,
            highlightedOptionId: null,
            ...this.matchValue()
        });
    }

    handleBlur() {
        this.setState({ highlightedOptionId: null });
    }

    handleHighlightOption(event, { id }) {
        event.persist();
        const option = this.getOptionById(id);
        if (!option) return; // prevent highlighting of empty option
        this.setState(state => ({
            highlightedOptionId: id,
            inputValue:
                event.type === "keydown" ? option.label : state.inputValue
        }));
    }

    handleSelectOption(_, { id }) {
        const option = this.getOptionById(id);
        if (!option) return; // prevent selecting of empty option
        this.setState({
            selectedOptionId: id,
            selectedOptionLabel: option.label,
            inputValue: option.label,
            isShowingOptions: false,
            options: [this.getOptionById(id)]
        });

        // TODO: Let selected object be prop only, not duplicated in child state
        this.props.setObject(id);
    }

    handleInputChange(event) {
        const value = event.target.value;

        if (value === "") {
            this.setState({
                isLoading: true,
                inputValue: "",
                isShowingOptions: true,
                selectedOptionId: null,
                selectedOptionLabel: null,
                options: []
            });
            this.refresh(null);
        } else {
            this.setState({
                isLoading: true,
                inputValue: value,
                isShowingOptions: true,
                options: [],
                highlightedOptionId: null
            });
            this.refresh(value);
        }
    }

    render() {
        const {
            inputValue,
            isShowingOptions,
            isLoading,
            highlightedOptionId,
            selectedOptionId,
            options
        } = this.state;

        return (
            <div>
                <Select
                    renderLabel=""
                    placeholder="Start typing to search..."
                    assistiveText="Type to search"
                    inputValue={inputValue}
                    isShowingOptions={isShowingOptions}
                    onBlur={this.handleBlur}
                    onInputChange={this.handleInputChange}
                    onRequestShowOptions={this.handleShowOptions}
                    onRequestHideOptions={this.handleHideOptions}
                    onRequestHighlightOption={this.handleHighlightOption}
                    onRequestSelectOption={this.handleSelectOption}
                >
                    {options.length > 0 ? (
                        options.map(option => {
                            return (
                                <Select.Option
                                    id={option.id}
                                    key={option.id}
                                    isHighlighted={
                                        option.id === highlightedOptionId
                                    }
                                    isSelected={option.id === selectedOptionId}
                                >
                                    {option.label}
                                </Select.Option>
                            );
                        })
                    ) : (
                        <Select.Option id="empty-option" key="empty-option">
                            {isLoading ? (
                                <Spinner renderTitle="Loading" size="x-small" />
                            ) : (
                                "No results"
                            )}
                        </Select.Option>
                    )}
                </Select>
            </div>
        );
    }
}

export default AsyncSelect;
