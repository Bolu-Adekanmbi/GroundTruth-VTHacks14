import "@testing-library/jest-dom/vitest";
import { createElement, forwardRef, type ReactNode, useEffect, useImperativeHandle } from "react";
import { vi } from "vitest";

vi.mock("react-map-gl/maplibre", () => {
  const MapMock = forwardRef(function MapMock(
    {
      children,
      onLoad
    }: {
      children?: ReactNode;
      onLoad?: () => void;
    },
    ref
  ) {
    useImperativeHandle(ref, () => ({
      getMap: () => ({
        addLayer: vi.fn(),
        addSource: vi.fn(),
        fitBounds: vi.fn(),
        getLayer: vi.fn(() => false),
        getSource: vi.fn(() => undefined),
        moveLayer: vi.fn()
      })
    }));
    useEffect(() => {
      onLoad?.();
    }, [onLoad]);

    return createElement("div", { "data-testid": "maplibre-map" }, children);
  });

  function Passthrough({ children }: { children?: ReactNode }) {
    return createElement("div", null, children);
  }

  function MarkerMock({ children }: { children?: ReactNode }) {
    return createElement("div", null, children);
  }

  return {
    default: MapMock,
    Layer: Passthrough,
    Marker: MarkerMock,
    NavigationControl: () => createElement("div", { "data-testid": "navigation-control" }),
    ScaleControl: () => createElement("div", { "data-testid": "scale-control" }),
    Source: Passthrough
  };
});

if (!URL.createObjectURL) {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:groundtruth-test")
  });
}

if (!URL.revokeObjectURL) {
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn()
  });
}
