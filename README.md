# Open Flags

`open-flags` is a lightweight JavaScript library for handling flag SVGs. It provides functions to fetch and display SVG flags based on country and region codes. This library is perfect for integrating into web applications built with frameworks like React, Vue, Angular, or standard JavaScript.

## Installation

Install the package via npm:

```sh
npm install open-flags
```
or yarn
```
yarn add open-flags

```
# Usage

## React

### Installation
```
npm install open-flags
# or
yarn add open-flags
```
Example React Usage
```
import React, { useState } from 'react';
import { getAllFlags, getFlagsByCountry, getFlagSvg } from 'open-flags';

const FlagList: React.FC = () => {
  const [country, setCountry] = useState('');

  const handleCountryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCountry(event.target.value.toLowerCase());
  };

  const flagsToDisplay = country ? getFlagsByCountry(country) : getAllFlags();

  return (
    <div>
      <h1>Flags</h1>
      <input
        type="text"
        placeholder="Enter country code"
        value={country}
        onChange={handleCountryChange}
      />
      <div>
        {flagsToDisplay.map(flag => {
          const [country, region] = flag.split('/');
          const svgContent = getFlagSvg(country, region);
          return (
            <div key={flag}>
              <h2>{flag}</h2>
              <div dangerouslySetInnerHTML={{ __html: svgContent }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FlagList;
```

Use the FlagList component in your App.tsx:

```
import React from 'react';
import FlagList from './FlagList';

const App: React.FC = () => {
  return (
    <div className="App">
      <FlagList />
    </div>
  );
};

export default App;

```

## Vue


### Installation

```
npm install open-flags
# or
yarn add open-flags
```

#### Example Component

Create a FlagList.vue component to display all flags or filter by country:

```
<template>
  <div>
    <h1>Flags</h1>
    <input v-model="country" placeholder="Enter country code" />
    <div v-for="flag in flagsToDisplay" :key="flag">
      <h2>{{ flag }}</h2>
      <div v-html="getFlagSvgContent(flag)"></div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { getAllFlags, getFlagsByCountry, getFlagSvg } from 'open-flags';

export default {
  setup() {
    const country = ref('');

    const flagsToDisplay = computed(() =>
      country.value ? getFlagsByCountry(country.value) : getAllFlags()
    );

    const getFlagSvgContent = (flag) => {
      const [country, region] = flag.split('/');
      return getFlagSvg(country, region);
    };

    return {
      country,
      flagsToDisplay,
      getFlagSvgContent,
    };
  },
};
</script>
```


## Angular

### Installation

```
npm install open-flags
# or
yarn add open-flags
```

#### Example Component

Create a flag-list.component.ts to display all flags or filter by country:


```
import { Component } from '@angular/core';
import { getAllFlags, getFlagsByCountry, getFlagSvg } from 'open-flags';

@Component({
  selector: 'app-flag-list',
  template: `
    <div>
      <h1>Flags</h1>
      <input [(ngModel)]="country" placeholder="Enter country code" />
      <div *ngFor="let flag of flagsToDisplay()">
        <h2>{{ flag }}</h2>
        <div [innerHTML]="getFlagSvgContent(flag)"></div>
      </div>
    </div>
  `,
})
export class FlagListComponent {
  country: string = '';

  flagsToDisplay(): string[] {
    return this.country ? getFlagsByCountry(this.country) : getAllFlags();
  }

  getFlagSvgContent(flag: string): string {
    const [country, region] = flag.split('/');
    return getFlagSvg(country, region);
  }
}
```

Add FormsModule to your AppModule:

```
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { FlagListComponent } from './flag-list.component';

@NgModule({
  declarations: [AppComponent, FlagListComponent],
  imports: [BrowserModule, FormsModule],
  bootstrap: [AppComponent],
})
export class AppModule {}
```


## Standard JavaScript

### Installation
```
npm install open-flags
# or
yarn add open-flags
```

#### Example Usage
```
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flags</title>
</head>
<body>
  <div>
    <h1>Flags</h1>
    <input id="country-input" type="text" placeholder="Enter country code" />
    <div id="flags-container"></div>
  </div>

  <script type="module">
    import { getAllFlags, getFlagsByCountry, getFlagSvg } from 'open-flags';

    const countryInput = document.getElementById('country-input');
    const flagsContainer = document.getElementById('flags-container');

    const renderFlags = (flags) => {
      flagsContainer.innerHTML = '';
      flags.forEach((flag) => {
        const [country, region] = flag.split('/');
        const svgContent = getFlagSvg(country, region);
        const flagDiv = document.createElement('div');
        flagDiv.innerHTML = `<h2>${flag}</h2><div>${svgContent}</div>`;
        flagsContainer.appendChild(flagDiv);
      });
    };

    countryInput.addEventListener('input', () => {
      const country = countryInput.value.toLowerCase();
      const flags = country ? getFlagsByCountry(country) : getAllFlags();
      renderFlags(flags);
    });

    renderFlags(getAllFlags());
  </script>
</body>
</html>
```


## API

#### getFlagSvg(country: string, region: string): string
Returns the SVG content for the specified country and region.

#### getAllFlags(): string[]
Returns an array of all available flags in the format country/region.

#### getFlagsByCountry(country: string): string[]
Returns an array of flags for the specified country.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request.

