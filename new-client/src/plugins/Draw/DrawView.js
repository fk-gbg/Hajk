import React from "react";
import { createPortal } from "react-dom";
import { withStyles } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import DeleteIcon from "@material-ui/icons/Delete";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";
import SaveAltIcon from "@material-ui/icons/SaveAlt";
import NativeSelect from "@material-ui/core/NativeSelect";
import FormControl from "@material-ui/core/FormControl";
import Input from "@material-ui/core/Input";
import InputLabel from "@material-ui/core/InputLabel";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Typography from "@material-ui/core/Typography/Typography";
import Checkbox from "@material-ui/core/Checkbox";
import { withSnackbar } from "notistack";
import Dialog from "../../components/Dialog.js";
import Symbology from "./components/Symbology.js";

import "./draw.css";

const styles = (theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
  row: {
    marginBottom: "10px",
  },
});

class DrawView extends React.PureComponent {
  state = {
    shape: "LineString",
    drawMethod: "add",
    displayText: false,
  };

  constructor(props) {
    super(props);
    this.model = this.props.model;
    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.globalObserver;
    this.snackbarKey = null;
    this.localObserver.subscribe("dialog", (feature) => {
      this.setState({
        feature: feature,
        dialog: true,
        dialogPrompt: true,
        dialogText: "",
        dialogButtonText: "OK",
        dialogAbortText: "Avbryt",
        dialogCloseCallback: this.onCloseTextDialog,
        dialogAbortCallback: this.onAbortTextDialog,
      });
    });
    this.addMapDropListeners();
  }

  addMapDropListeners = () => {
    const mapDiv = document.getElementById("map");
    ["drop", "dragover", "dragend", "dragleave", "dragenter"].forEach(
      (eventName) => {
        mapDiv.addEventListener(
          eventName,
          this.preventDefaultDropBehavior,
          false
        );
      }
    );
    mapDiv.addEventListener("dragenter", this.handleDragEnter, false);
    mapDiv.addEventListener("drop", this.handleDrop, false);
  };

  handleDragEnter = () => {
    this.snackbarKey = this.props.enqueueSnackbar(
      "Släpp en KML-fil i kartan för att importera!"
    );
  };

  handleDrop = (e) => {
    try {
      const file = e.dataTransfer.files[0];
      if (file) {
        const fileType = file.type ? file.type : file.name.split(".").pop();
        //Not sure about filetype for kml... Qgis- and Hajk-generated kml:s does not contain any information about type.
        //The application/vnd... is a guess.
        if (
          fileType === "kml" ||
          fileType === "application/vnd.google-earth.kml+xml"
        ) {
          this.globalObserver.publish("draw.showWindow", {
            hideOtherPlugins: false,
          });
          this.addDroppedKmlToMap(file);
        }
      }
    } catch (error) {
      this.props.enqueueSnackbar("KML-filen kunde inte importeras.", {
        variant: "error",
      });
      console.error(`Error importing KML-file... ${error}`);
    }
  };

  addDroppedKmlToMap = (file) => {
    const { model } = this.props;
    const reader = new FileReader();

    reader.onload = () => {
      model.import(reader.result, (error) => {
        this.handleImportError(error);
      });
      this.props.closeSnackbar(this.snackbarKey);
      this.snackbarKey = null;
    };

    reader.readAsText(file);
  };

  handleImportError = (error) => {
    if (error === "no-features-found") {
      this.props.enqueueSnackbar("Inga ritobjekt hittades i KML-filen.", {
        variant: "warning",
      });
    } else {
      throw error;
    }
  };

  preventDefaultDropBehavior = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  handleChange = (name) => (event) => {
    this.setState({ [name]: event.target.value });
    if (name === "shape") {
      this.props.model.setType(event.target.value);
    }
    if (name === "drawMethod") {
      this.props.model.setDrawMethod(event.target.value);
    }
  };

  onAbortTextDialog = () => {
    this.setState({
      dialog: false,
    });
  };

  onCloseTextDialog = (text) => {
    this.props.model.openDialog(false);

    const { feature } = this.state;
    feature.set("type", "Text");
    feature.set("text", text);
    feature.setStyle(this.props.model.getStyle(feature));
    this.setState({
      dialog: false,
    });
    this.props.model.redraw();
  };

  renderDialog() {
    if (this.state.dialog) {
      this.props.model.openDialog(true);

      return createPortal(
        <Dialog
          options={{
            text: this.state.dialogText,
            prompt: this.state.dialogPrompt,
            headerText: this.state.dialogHeaderText || "Ange text",
            buttonText: this.state.dialogButtonText || "OK",
            abortText: this.state.dialogAbortText,
          }}
          open={this.state.dialog}
          onClose={this.state.dialogCloseCallback}
          onAbort={this.state.dialogAbortCallback}
        />,
        document.getElementById("map")
      );
    } else {
      return null;
    }
  }

  renderForm() {
    const { classes } = this.props;
    const { drawMethod } = this.state;

    if (drawMethod === "add") {
      return (
        <>
          <div className={classes.row}>
            <FormControl className={classes.formControl}>
              <InputLabel htmlFor="shape-native-helper">
                Typ av ritobjekt
              </InputLabel>
              <NativeSelect
                value={this.state.shape}
                onChange={this.handleChange("shape")}
                input={<Input name="shape" id="shape-native-helper" />}
              >
                <option value="LineString">Linje</option>
                <option value="Text">Text</option>
                <option value="Polygon">Yta</option>
                <option value="Square">Rektangel</option>
                <option value="Circle">Cirkel</option>
                <option value="Point">Punkt</option>
              </NativeSelect>
            </FormControl>
          </div>
          <div className={classes.row}>
            <div>Ritmanér</div>
            <Symbology type={this.state.shape} model={this.props.model} />
          </div>
        </>
      );
    }

    if (drawMethod === "edit") {
      return (
        <>
          <Typography>
            Klicka på ett ritobjekt i kartan som du vill editera. Du kan editera
            dina egna ritobjekt. För att editera andra objekt använd
            editeraverktyget.
          </Typography>
        </>
      );
    }

    if (drawMethod === "remove") {
      return (
        <>
          <Typography>
            Klicka på ett ritobjekt i kartan som du vill ta bort. Du kan ta bort
            dina egna ritobjekt. För att ta bort andra objekt använd
            editeraverktyget.
          </Typography>
        </>
      );
    }

    if (drawMethod === "move") {
      return (
        <>
          <Typography>
            Klicka på det ritobjekt i kartan som du vill flytta för att aktivera
            flyttläge, dra därefter objektet till ny position. Du kan flytta
            dina egna ritobjekt. För att flytta andra objekt använd
            editeraverktyget.
          </Typography>
        </>
      );
    }

    if (drawMethod === "import") {
      return (
        <>
          <div>
            <Button onClick={this.openUploadDialog}>
              <FolderOpenIcon />
              &nbsp; Importera ritobjekt
            </Button>
          </div>
          <div>
            <Button onClick={this.props.model.export}>
              <SaveAltIcon />
              &nbsp; Exportera ritobjekt
            </Button>
          </div>
        </>
      );
    }
  }

  openUploadDialog = (e) => {
    this.setState({
      dialog: true,
      dialogPrompt: false,
      dialogHeaderText: "Ladda upp innehåll",
      dialogText: this.renderImport(),
      dialogButtonText: "Avbryt",
      dialogCloseCallback: this.onCloseUploadDialog,
    });
  };

  onCloseUploadDialog = () => {
    this.setState({
      dialog: false,
    });
    return;
  };

  renderImport() {
    const { classes } = this.props;
    return (
      <div>
        <Typography>Välj KML-fil att importera:</Typography>
        <div className={classes.row}>
          <input
            type="file"
            name="files[]"
            accept=".kml"
            multiple={false}
            id="file-uploader"
          />
        </div>
        <div className={classes.row}>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            value="Ladda upp"
            onClick={() => {
              var fileUploader = document.getElementById("file-uploader");
              var file = fileUploader.files[0];
              var reader = new FileReader();
              reader.onload = () => {
                this.onCloseUploadDialog();
                this.props.model.import(reader.result, (error) => {
                  try {
                    this.handleImportError(error);
                  } catch (error) {
                    console.error(`Error importing KML-file... ${error}`);
                  }
                });
              };
              if (file) {
                reader.readAsText(file);
              }
            }}
          >
            Ladda upp
          </Button>
        </div>
      </div>
    );
  }

  render() {
    const { classes } = this.props;
    return (
      <>
        <div className={classes.row}>
          <div className={classes.row}>
            <Button variant="contained" onClick={this.props.model.clear}>
              <DeleteIcon />
              Ta bort alla ritobjekt
            </Button>
          </div>
          <div className={classes.row}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={this.state.displayText}
                  onChange={() => {
                    this.setState({
                      displayText: !this.state.displayText,
                    });
                    this.model.displayText = !this.model.displayText;
                    this.localObserver.publish("update");
                  }}
                  color="primary"
                />
              }
              label="Visa mått på ritobjekt"
            />
          </div>
          <FormControl className={classes.formControl}>
            <InputLabel htmlFor="drawMethod-native-helper">
              Aktivitet
            </InputLabel>
            <NativeSelect
              value={this.state.drawMethod}
              onChange={this.handleChange("drawMethod")}
              input={<Input name="drawMethod" id="drawMethod-native-helper" />}
            >
              <option value="abort">Ingen</option>
              <option value="add">Lägg till objekt</option>
              <option value="remove">Ta bort objekt</option>
              <option value="edit">Editera objekt</option>
              <option value="move">Flytta objekt</option>
              <option value="import">Importera/Exportera</option>
            </NativeSelect>
          </FormControl>
        </div>
        {this.renderForm()}
        {this.renderDialog()}
      </>
    );
  }
}

DrawView.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(withSnackbar(DrawView));
