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
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { Typography } from "@mui/material";
import HajkToolTip from "components/HajkToolTip";

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
  constructor(props) {
    super(props);

    this.state = this.getStateFromModel(props.model);

    this.subscriptions = [
      props.observer.subscribe("create-contract", (_message) => {
        this.setState(this.getStateFromModel(props.model));
      }),

      props.observer.subscribe("feature-modified", (_vectorSource) => {
        this.setState({
          featureModified: props.model.featureModified,
        });
      }),

      props.observer.subscribe("feature-added", (_message) => {
        this.setState({
          editFeatureId: this.props.model.editFeatureId,
          featuresExist: true,
          featureModified: true,
        });
      }),

      props.observer.subscribe("feature-deleted-by-user", (_message) => {
        this.setState({
          featuresExist: this.props.model.geometriesExist,
          featureModified: true,
        });
      }),

      props.observer.subscribe("editing-existing-contract", (_message) => {
        this.setState({
          editingExisting: true,
          featuresExist: true,
        });
      }),

      props.observer.subscribe("feature-selected-for-edit", (_message) => {
        this.setState({
          editFeatureId: this.props.model.editFeatureId,
        });
      }),

      props.observer.subscribe("edit-feature-reset", (_message) => {
        this.setState({
          editFeatureId: undefined,
          featureModified: true,
        });
      }),
    ];
  }

  componentWillUnmount() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  getStateFromModel(model) {
    return {
      createMethod: model.createMethod,
      featuresExist: model.geometriesExist,
      editFeatureId: model.editFeatureId,
      allowLine: model.editSource
        ? model.editSource.allowedGeometries.indexOf("Line") > -1
        : true,
      allowPolygon: model.editSource
        ? model.editSource.allowedGeometries.indexOf("Polygon") > -1
        : true,
      promptForAttributes: model.promptForAttributes,
      featureModified: model.featureModified,
      editingExisting: model.editingExisting,
    };
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
      <Grid container direction="column" align="center">
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
            <HajkToolTip title="Klicka på första punkten där du vill skapa en nod, och fortsätt klicka en gång per ny nod. Avsluta med dubbelklick.">
              <span style={{ display: "flex" }}>
                <FormatShapesIcon size="small" sx={{ paddingRight: 0.5 }} />
                <Typography>SKAPA YTA</Typography>
              </span>
            </HajkToolTip>
          </StyledToggleButton>

          <StyledToggleButton
            disabled={!this.state.allowLine}
            key={2}
            value="addLine"
          >
            <HajkToolTip title="Klicka på första punkten där du vill skapa en nod, och fortsätt klicka en gång per ny nod. Avsluta med dubbelklick.">
              <span style={{ display: "flex" }}>
                <TimelineIcon sx={{ paddingRight: 0.5 }} />
                <Typography>SKAPA LINJE</Typography>
              </span>
            </HajkToolTip>
          </StyledToggleButton>
          <StyledToggleButton
            key={3}
            value="addEstate"
            disabled={!this.state.allowPolygon}
          >
            <HajkToolTip title="För att kopiera en befintlig yta, säkerställ att lagret du vill kopiera en yta ifrån är tänt i lagerhanteraren (syns även som flik längst ner i kartan) och att objektet inte täcks av objekt från något annat lager (gäller ej bakgrundskartor). Släck annars lagret (räcker ej att klicka på ögat). Så snart du har valt ett objekt kopplas det till det avtal du redigerar.">
              <span style={{ display: "flex" }}>
                <TouchAppIcon sx={{ paddingRight: 0.5 }} />
                <Typography>VÄLJ YTA</Typography>
              </span>
            </HajkToolTip>
          </StyledToggleButton>
          <StyledToggleButton
            key={4}
            disabled={!this.state.featuresExist}
            value="edit"
          >
            <HajkToolTip title="För att redigera en geometri; klicka på verktyget och dra sedan i noderna.">
              <span style={{ display: "flex" }}>
                <EditIcon sx={{ paddingRight: 0.5 }} />
                <Typography>REDIGERA</Typography>
              </span>
            </HajkToolTip>
          </StyledToggleButton>
          <StyledToggleButton
            key={5}
            disabled={!this.state.featuresExist}
            value="remove"
            title="Ta bort ett objekt genom att markera det i kartan."
          >
            <HajkToolTip title="Om du vill radera en yta kan du använda Radera-verktyget. Aktivera verktyget i menyn och klicka sedan på den yta du vill ta bort. För att ytan skall försvinna från Markis måste du klicka på spara när du är klar. OBS: Du kan enbart radera ytor kopplade till det avtal du arbetar med.">
              <span style={{ display: "flex" }}>
                <DeleteIcon sx={{ paddingRight: 0.5 }} />
                <Typography>RADERA</Typography>
              </span>
            </HajkToolTip>
          </StyledToggleButton>
          <StyledToggleButton
            disabled={!model.promptForAttributes || !this.state.featuresExist}
            key={6}
            value="editAttributes"
            title="Ändra ytans attribut genom att markera den i kartan."
          >
            <HajkToolTip title="Om du vill ändra attribut på en yta kan du använda Ändra attribut-verktyget. Aktivera verktyget i menyn och klicka sedan på den yta du vill redigera. För att ytan skall uppdateras måste du klicka på spara när du är klar.">
              <span style={{ display: "flex" }}>
                <TuneIcon sx={{ paddingRight: 0.5 }} />
                <Typography>ÄNDRA ATTRIBUT</Typography>
              </span>
            </HajkToolTip>
          </StyledToggleButton>
        </StyledToggleButtonGroup>
      </Grid>
    );

    const btnSave = (
      <HajkToolTip title="Spara och stäng.">
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
      </HajkToolTip>
    );

    const btnAbort = (
      <HajkToolTip title="Avbryt pågående arbete.">
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
      </HajkToolTip>
    );

    const btnRemoveSearchResult = (
      <HajkToolTip title="Rensa bort sökresultat från kartan.">
        <span>
          <CreateButton
            variant="contained"
            onClick={this.clearSearchResult}
            disabled={!model.markisParameters.objectId}
          >
            <Typography>Rensa</Typography>
          </CreateButton>
        </span>
      </HajkToolTip>
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
