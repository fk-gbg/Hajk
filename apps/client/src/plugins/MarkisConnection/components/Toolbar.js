import React from "react";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Grid from "@mui/material/Grid";
import EditIcon from "@mui/icons-material/Edit";
import FormatShapesIcon from "@mui/icons-material/FormatShapes";
import TuneIcon from "@mui/icons-material/Tune";
import DeleteIcon from "@mui/icons-material/Delete";
import TimelineIcon from "@mui/icons-material/Timeline";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { Typography } from "@mui/material";

const Centered = styled("div")(({ theme }) => ({
  paddingTop: theme.spacing(4),
  textAlign: "center",
  width: "100%",
}));

const CreateButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1),
  width: 100,
}));

const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  width: "100%",
  color: theme.palette.text.secondary,
  justifyContent: "left",
}));

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => ({
  grouped: {
    borderRight: "none",
    borderLeft: "none",
    borderRadius: 0,
  },
  margin: theme.spacing(0),
  display: "flex",
  width: "100%",
}));

class Toolbar extends React.Component {
  state = {
    createMethod: "abort",
    featuresExist: false,
    editFeatureId: undefined,
    allowLine: true,
    allowPolygon: true,
    promptForAttributes: false,
    featureModified: false,
    editingExisting: false,
  };

  constructor(props) {
    super(props);

    props.observer.subscribe("create-contract", (message) => {
      this.setState({
        featuresExist: props.model.geometriesExist,
        editFeatureId: props.model.editFeatureId,
        featureModified: props.model.featureModified,
        editingExisting: props.model.editingExisting,
        allowLine:
          props.model.editSource.allowedGeometries.indexOf("Line") > -1,
        allowPolygon:
          props.model.editSource.allowedGeometries.indexOf("Polygon") > -1,
        promptForAttributes: props.model.promptForAttributes,
      });
    });

    props.observer.subscribe("feature-modified", (vectorSource) => {
      this.setState({
        featureModified: props.model.featureModified,
      });
    });

    props.observer.subscribe("feature-added", (message) => {
      this.setState({
        editFeatureId: this.props.model.editFeatureId,
        featuresExist: true,
        featureModified: true,
      });
    });

    props.observer.subscribe("feature-deleted-by-user", (message) => {
      this.setState({
        featuresExist: this.props.model.geometriesExist,
        featureModified: true,
      });
    });

    props.observer.subscribe("editing-existing-contract", (message) => {
      this.setState({
        editingExisting: true,
        featuresExist: true,
      });
    });

    props.observer.subscribe("feature-selected-for-edit", (message) => {
      this.setState({
        editFeatureId: this.props.model.editFeatureId,
      });
    });

    props.observer.subscribe("edit-feature-reset", (message) => {
      this.setState({
        editFeatureId: undefined,
        featureModified: true,
      });
    });
  }

  abortCreation = () => {
    this.props.panel.reset();
  };

  saveCreated = () => {
    const { model } = this.props;
    if (model.markisParameters.type !== "Contract") {
      if (!model.validateTradeGeometries()) {
        this.props.messageHandler(
          "Du måste ange diarienummer och fastighetsnummer innan du sparar!",
          "error"
        );
        return;
      }
    }
    model.invokeCompleteMessage((done) => {
      if (done.error) {
        this.props.messageHandler(
          "Geometrierna gick inte att spara då de innehöll self-intersects."
        );
        this.props.panel.reset();
      } else {
        model.save((r) => {
          if (r && r.TransactionResponse.TransactionSummary) {
            if (
              Number(
                r.TransactionResponse.TransactionSummary.totalInserted.toString()
              ) > 0
            ) {
              this.props.messageHandler(
                "Geometrin skapades utan problem!",
                "success"
              );
              model.refreshLayersByIds(model.editSource.activeLayers);
              this.props.panel.reset();
            } else if (
              Number(
                r.TransactionResponse.TransactionSummary.totalUpdated.toString()
              ) > 0
            ) {
              this.props.messageHandler(
                "Geometrin uppdaterades utan problem!",
                "success"
              );
              model.refreshLayersByIds(model.editSource.activeLayers);
              this.props.panel.reset();
            } else if (
              Number(
                r.TransactionResponse.TransactionSummary.totalDeleted.toString()
              ) > 0
            ) {
              this.props.messageHandler(
                "Geometrin togs bort utan problem.",
                "success"
              );
              model.refreshLayersByIds(model.editSource.activeLayers);
              this.props.panel.reset();
            } else {
              this.props.messageHandler(
                "Geometrin gick inte att spara. Försök igen senare."
              );
              this.props.panel.reset();
            }
          } else {
            this.props.messageHandler(
              "Geometrin gick inte att spara. Fösök igen senare."
            );
            this.props.panel.reset();
          }
        });
      }
    });
  };

  clearSearchResult = () => {
    this.props.model.clearSearchResult();
  };

  handleChange = (name) => (event) => {
    if (this.state[name] === event.currentTarget.value) {
      this.setState({ [name]: undefined });
      this.props.model.setCreateMethod("abort");
    } else {
      this.setState({ [name]: event.currentTarget.value });
      this.props.model.setCreateMethod(event.currentTarget.value);
    }
  };

  renderButtons() {
    const { model } = this.props;
    const editTools = (
      <Grid container direction="column" alignItems="center">
        <StyledToggleButtonGroup
          orientation="vertical"
          size="small"
          exclusive
          onChange={this.handleChange("createMethod")}
          value={this.state.createMethod}
        >
          <StyledToggleButton
            key={1}
            value="add"
            disabled={!this.state.allowPolygon}
          >
            <Tooltip title="Klicka på första punkten där du vill skapa en nod, och fortsätt klicka en gång per ny nod. Avsluta med dubbelklick.">
              <span style={{ display: "flex" }}>
                <FormatShapesIcon size="small" sx={{ paddingRight: 0.5 }} />
                <Typography>SKAPA YTA</Typography>
              </span>
            </Tooltip>
          </StyledToggleButton>

          <StyledToggleButton
            disabled={!this.state.allowLine}
            key={2}
            value="addLine"
          >
            <Tooltip title="Klicka på första punkten där du vill skapa en nod, och fortsätt klicka en gång per ny nod. Avsluta med dubbelklick.">
              <span style={{ display: "flex" }}>
                <TimelineIcon sx={{ paddingRight: 0.5 }} />
                <Typography>SKAPA LINJE</Typography>
              </span>
            </Tooltip>
          </StyledToggleButton>
          <StyledToggleButton
            key={3}
            value="addEstate"
            disabled={!this.state.allowPolygon}
          >
            <Tooltip title="För att kopiera en befintlig yta, säkerställ att lagret du vill kopiera en yta ifrån är tänt i lagerhanteraren (syns även som flik längst ner i kartan) och att objektet inte täcks av objekt från något annat lager (gäller ej bakgrundskartor). Släck annars lagret (räcker ej att klicka på ögat). Så snart du har valt ett objekt kopplas det till det avtal du redigerar.">
              <span style={{ display: "flex" }}>
                <TouchAppIcon sx={{ paddingRight: 0.5 }} />
                <Typography>VÄLJ YTA</Typography>
              </span>
            </Tooltip>
          </StyledToggleButton>
          <StyledToggleButton
            key={4}
            disabled={!this.state.featuresExist}
            value="edit"
          >
            <Tooltip title="För att redigera en geometri; klicka på verktyget och dra sedan i noderna.">
              <span style={{ display: "flex" }}>
                <EditIcon sx={{ paddingRight: 0.5 }} />
                <Typography>REDIGERA</Typography>
              </span>
            </Tooltip>
          </StyledToggleButton>
          <StyledToggleButton
            key={5}
            disabled={!this.state.featuresExist}
            value="remove"
            title="Ta bort ett objekt genom att markera det i kartan."
          >
            <Tooltip title="Om du vill radera en yta kan du använda Radera-verktyget. Aktivera verktyget i menyn och klicka sedan på den yta du vill ta bort. För att ytan skall försvinna från Markis måste du klicka på spara när du är klar. OBS: Du kan enbart radera ytor kopplade till det avtal du arbetar med.">
              <span style={{ display: "flex" }}>
                <DeleteIcon sx={{ paddingRight: 0.5 }} />
                <Typography>RADERA</Typography>
              </span>
            </Tooltip>
          </StyledToggleButton>
          <StyledToggleButton
            disabled={!model.promptForAttributes || !this.state.featuresExist}
            key={6}
            value="editAttributes"
            title="Ändra ytans attribut genom att markera den i kartan."
          >
            <Tooltip title="Om du vill ändra attribut på en yta kan du använda Ändra attribut-verktyget. Aktivera verktyget i menyn och klicka sedan på den yta du vill redigera. För att ytan skall uppdateras måste du klicka på spara när du är klar.">
              <span style={{ display: "flex" }}>
                <TuneIcon sx={{ paddingRight: 0.5 }} />
                <Typography>ÄNDRA ATTRIBUT</Typography>
              </span>
            </Tooltip>
          </StyledToggleButton>
        </StyledToggleButtonGroup>
      </Grid>
    );

    const btnSave = (
      <Tooltip title="Spara och stäng.">
        <span>
          <CreateButton
            variant="contained"
            color="primary"
            size="small"
            onClick={this.saveCreated}
            startIcon={<SaveIcon />}
            disabled={
              !(this.state.featuresExist && !this.state.editingExisting) &&
              !(this.state.featureModified && this.state.editingExisting)
            }
          >
            <Typography>Spara</Typography>
          </CreateButton>
        </span>
      </Tooltip>
    );

    const btnAbort = (
      <Tooltip title="Avbryt pågående arbete.">
        <span>
          <CreateButton
            variant="contained"
            size="small"
            onClick={this.abortCreation}
            startIcon={<CancelIcon />}
          >
            <Typography>Avbryt</Typography>
          </CreateButton>
        </span>
      </Tooltip>
    );

    const btnRemoveSearchResult = (
      <Tooltip title="Rensa bort sökresultat från kartan.">
        <span>
          <CreateButton
            variant="contained"
            onClick={this.clearSearchResult}
            disabled={!model.markisParameters.objectId}
          >
            <Typography>Rensa</Typography>
          </CreateButton>
        </span>
      </Tooltip>
    );

    if (
      !(this.props.model.editFeatureId && this.props.model.promptForAttributes)
    ) {
      if (model.markisParameters.userMode === "Create") {
        return (
          <div>
            <div>{editTools}</div>
            <Centered>
              {btnAbort}
              {btnSave}
            </Centered>
          </div>
        );
      } else {
        if (model.markisParameters.objectId) {
          return <Centered>{btnRemoveSearchResult}</Centered>;
        } else {
          return null;
        }
      }
    } else {
      return null;
    }
  }

  render() {
    return this.renderButtons();
  }
}

export default Toolbar;
