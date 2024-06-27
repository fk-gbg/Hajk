import React from "react";
import { styled } from "@mui/material/styles";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import NativeSelect from "@mui/material/NativeSelect";
import FormLabel from "@mui/material/FormLabel";
import Input from "@mui/material/Input";

const Root = styled("div")(() => ({
  display: "flex",
  flexWrap: "wrap",
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  display: "flex",
  flexWrap: "wrap",
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  margin: theme.spacing(1),
  minWidth: 120,
  width: "100%",
}));

const AttributeButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1),
  width: 90,
}));

const Centered = styled("div")(() => ({
  textAlign: "center",
}));

class AttributeEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      formValues: {},
      editFeatureId: undefined,
      featureModified: false,
    };

    props.observer.subscribe("feature-selected-for-edit", (vectorSource) => {
      this.setState({
        formValues: this.initFormValues() || {},
      });
    });

    props.observer.subscribe("feature-added", (vectorSource) => {
      if (this.props.model.promptForAttributes) {
        this.setState({
          formValues: this.initFormValues() || {},
        });
      }
    });

    props.observer.subscribe("edit-feature-reset", (message) => {
      this.setState({
        editFeatureId: undefined,
        featureModified: true,
      });
    });
  }

  initFormValues() {
    const { model } = this.props;
    var formValues = {};
    var editableFields = model.editSource.editableFields;
    if (model.editFeatureId) {
      var editFeature = model.vectorSource.getFeatureById(model.editFeatureId);
      for (var i = 0; i < editableFields.length; i++) {
        formValues[editableFields[i].name] =
          editFeature.get(editableFields[i].name) || "";
      }
    }

    return formValues;
  }

  checkText(name, value) {
    var formValues = this.state.formValues;
    formValues[name] = value;
    this.setState({
      formValues: formValues,
    });
    this.updateFeature(
      this.props.model.vectorSource.getFeatureById(
        this.props.model.editFeatureId
      )
    );
  }

  updateFeature(feature) {
    var props = feature.getProperties();
    Object.keys(this.state.formValues).forEach((key) => {
      var value = this.state.formValues[key];
      if (value === "") value = null;
      if (Array.isArray(value)) {
        value = value
          .filter((v) => v.checked)
          .map((v) => v.name)
          .join(";");
      }
      props[key] = value;
    });
    feature.setProperties(props);
  }

  getValueMarkup(field) {
    const { model } = this.props;
    switch (field.textType) {
      case "fritext":
        return (
          <>
            <StyledTextField
              id={field.id}
              label={field.displayName}
              margin="normal"
              variant="outlined"
              disabled={!model.editFeatureId}
              inputProps={{ maxLength: field.maxLength || undefined }}
              value={this.state.formValues[field.name]}
              onChange={(e) => {
                this.checkText(field.name, e.target.value);
              }}
            />
          </>
        );
      case "lista":
        let options = null;
        if (Array.isArray(field.values)) {
          options = field.values.map((val, i) => (
            <option key={i} value={val}>
              {val}
            </option>
          ));
        }
        return (
          <Root>
            <StyledFormControl component="fieldset">
              <FormLabel component="legend">{field.displayName}</FormLabel>
              <NativeSelect
                value={this.state.formValues[field.name]}
                disabled={!model.editFeatureId}
                input={<Input name={field.displayName} id={field.name} />}
                onChange={(e) => {
                  this.checkText(field.name, e.target.value);
                }}
              >
                <option value="">
                  {field.nullDisplayName || "-Välj värde-"}
                </option>
                {options}
              </NativeSelect>
            </StyledFormControl>
          </Root>
        );

      case null:
        return <span>{this.state.formValues[field.name]}</span>;
      default:
        return <span>{this.state.formValues[field.name]}</span>;
    }
  }

  acceptAttributes = () => {
    this.props.model.resetEditFeatureId();
  };

  createAttributeForm() {
    const { model } = this.props;

    const infoText = (
      <Typography>
        <b>Ange attribut:</b>
      </Typography>
    );

    const btnAcceptAttributes = (
      <Centered>
        <AttributeButton variant="contained" onClick={this.acceptAttributes}>
          <Typography>Ok</Typography>
        </AttributeButton>
      </Centered>
    );

    if (
      model.promptForAttributes &&
      model.markisParameters.userMode === "Create"
    ) {
      if (model.editFeatureId) {
        var markup = model.editSource.editableFields.map((field, i) => {
          var valueMarkup = this.getValueMarkup(field);
          return (
            <div key={i} ref={field.name}>
              {valueMarkup}
            </div>
          );
        });
        return (
          <div>
            {infoText}
            {markup}
            {btnAcceptAttributes}
          </div>
        );
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  render() {
    return this.createAttributeForm();
  }
}

export default AttributeEditor;
