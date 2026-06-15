import React from "react";
import { createPortal } from "react-dom";
import { IconButton, Grid, Typography } from "@mui/material";
import Slider from "@mui/material/Slider";
import { styled } from "@mui/material/styles";
import { withTheme } from "@emotion/react";
import PaletteIcon from "@mui/icons-material/Palette";
import Dialog from "../../../components/Dialog/Dialog";
import { SketchPicker } from "react-color";
import HajkToolTip from "components/HajkToolTip";

const ColorPickerContainer = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(2),
  paddingTop: 0,
  display: "flex",
  flexDirection: "column",
  align: "center",
  [theme.breakpoints.up("sm")]: {
    width: "auto",
  },
  [theme.breakpoints.down("sm")]: {
    width: "100%",
  },
}));

const ColorPickersContainer = styled(Grid)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  align: "flex-start",
  width: "100%",
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    align: "center",
  },
}));

const SliderContainer = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(2),
  width: "100%",
  maxWidth: 500,
  margin: "0 auto",
}));

class RGBA {
  static toString(o) {
    return `rgba(${o.r},${o.g},${o.b},${o.a})`;
  }

  static parse(s) {
    try {
      // 1. RegEx that matches stuff between a set of parentheses
      // 2. Execute that regex on the input string, but first remove any whitespace it may contain
      // 3. RegEx exec returns an array. Grab the second element, which will contain the value.
      // 4. Split the value to extract individual rgba values
      const o = /\(([^)]+)\)/.exec(s.replace(/\s/g, ""))[1].split(",");
      return {
        r: o[0],
        g: o[1],
        b: o[2],
        a: o[3],
      };
    } catch (error) {
      console.error("RGBA parsing failed: " + error.message);
    }
  }
}

class FeatureStyleChanger extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      dialogOpen: false,
      ...props.model.userSelectedStyleValues,
    };
  }

  handleColorChange = (target, color) => {
    this.setState({ [target]: RGBA.toString(color.rgb) }, () => {
      this.updateStyle();
    });
  };

  handleStrokeWidthChange = (width) => {
    this.setState({ strokeWidth: width }, () => {
      this.updateStyle();
    });
  };

  updateStyle = () => {
    const { strokeColor, fillColor, strokeWidth } = this.state;
    const { model } = this.props;
    model.updateFeatureStyle(strokeColor, fillColor, strokeWidth);
  };

  renderFeatureStyleToggler = () => {
    const { strokeColor, fillColor, strokeWidth } = this.state;
    return (
      <Grid container justifyContent="center" size={12}>
        <ColorPickersContainer size={12}>
          <ColorPickerContainer>
            <Typography gutterBottom>Kantlinjefärg</Typography>
            <SketchPicker
              color={RGBA.parse(strokeColor)}
              onChangeComplete={(color) =>
                this.handleColorChange("strokeColor", color)
              }
            />
          </ColorPickerContainer>
          <ColorPickerContainer>
            <Typography gutterBottom>Fyllnadsfärg</Typography>
            <SketchPicker
              color={RGBA.parse(fillColor)}
              onChangeComplete={(color) =>
                this.handleColorChange("fillColor", color)
              }
            />
          </ColorPickerContainer>
        </ColorPickersContainer>
        <SliderContainer size={12}>
          <Typography>{`Linjetjocklek, nu ${strokeWidth}px`}</Typography>
          <Slider
            aria-labelledby="stroke-width-picker"
            valueLabelDisplay="auto"
            step={0.5}
            marks
            onChangeCommitted={(e, value) => {
              this.handleStrokeWidthChange(value);
            }}
            value={strokeWidth}
            min={0.5}
            max={5}
          />
        </SliderContainer>
      </Grid>
    );
  };

  renderFeatureStyleChangerDialog = () => {
    const { dialogOpen } = this.state;

    if (dialogOpen) {
      return createPortal(
        <Dialog
          options={{
            text: this.renderFeatureStyleToggler(),
            headerText: "Ändra stil",
            buttonText: "OK",
            useLegacyNonMarkdownRenderer: true,
          }}
          open={dialogOpen}
          onClose={() => {
            this.setState({
              dialogOpen: false,
            });
          }}
        ></Dialog>,
        document.getElementById("windows-container")
      );
    } else {
      return null;
    }
  };

  render() {
    return (
      <>
        <HajkToolTip title="Klicka här för att ändra stil på ytorna. OBS: Detta påverkar bara stilen i denna sessionen, och är inget som sparas.">
          <IconButton
            onClick={() =>
              this.setState({ dialogOpen: !this.state.dialogOpen })
            }
            size="small"
          >
            <PaletteIcon />
          </IconButton>
        </HajkToolTip>
        {this.renderFeatureStyleChangerDialog()}
      </>
    );
  }
}

export default withTheme(FeatureStyleChanger);
