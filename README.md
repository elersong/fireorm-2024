# 🔥 FireORM24 🔥

[![NPM Version](https://img.shields.io/npm/v/fireorm24.svg?style=flat)](https://www.npmjs.com/package/fireorm24)
[![Build Status](https://github.com/elersong/fireorm24/actions/workflows/ci.yml/badge.svg)](https://github.com/elersong/fireorm24)
[![Typescript lang](https://img.shields.io/badge/Language-Typescript-lightskyblue.svg)](https://www.typescriptlang.org)
[![All Contributors](https://img.shields.io/badge/Contributors-18-coral?style=flat)](#contributors)
[![License](https://img.shields.io/badge/License-MIT-firebrick?style=flat)](https://opensource.org/license/mit)

## Introduction

FireORM24 is a lightweight wrapper for firebase-admin designed to simplify interactions with Firestore databases. By abstracting the access layer and offering a familiar repository pattern, FireORM24 streamlines the development process for applications that use Firestore, allowing developers to concentrate on creating new features without dealing with the intricacies of Firestore.

Willy Ovalle ([GH Profile](https://github.com/wovalle)), the original maintainer, stepped down from active support in March 2023. Since then, the project has been maintained through community contributions. The current effort, under the name FireORM24, focuses on updating the project with the latest security patches and new features to align with the latest Firebase advancements. The original project can be found [here](https://github.com/wovalle/fireorm).

For more information on the motivations behind the project, you can read Willy's original [introductory post on Medium](https://medium.com/p/ba7734644684). The [API documentation](https://wovalle.github.io/fireorm) is also available.


## Usage

1.  Install the npm package:

```bash
yarn add fireorm24 reflect-metadata #or npm install fireorm24 reflect-metadata

# note: the reflect-metadata shim is required
```

2. [Initialize](https://firebase.google.com/docs/firestore/quickstart) your Firestore application:

```typescript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import serviceAccount from "../firestore.creds.json"; // Adjust path as necessary

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);
fireorm.initialize(db);
```

3.  Create your Firestore models:

```typescript
import { Collection } from 'fireorm24';

@Collection()
class Programmer {
  id: string;
  name: string;
  language: string;
}
```

4.  Manage your Firestore data with ease!

```typescript
import { Collection, getRepository } from 'fireorm24';

@Collection()
class Programmer {
  id: string;
  name: string;
  language: string;
}

const programmerRepository = getRepository(Programmer);

const willy = new Programmer();
willy.name = "Willy Ovale";
willy.language = "Typescript";

const programmerDocument = await programmerRepository.create(willy); // Create programmer

const mySuperProgrammerDocument = await programmerRepository.findById(programmerDocument.id); // Read programmer

mySuperProgrammerDocument.language = "Typescript, .NET";
await programmerRepository.update(mySuperProgrammerDocument); // Update programmer

await programmerRepository.delete(mySuperProgrammerDocument.id); // Delete programmer
```


## Firebase Complex Data Types

Firestore supports complex data types such as GeoPoint and Reference. The integration of full support for these data types into the new FireORM project is currently in progress. This section will be updated with detailed information once the support is fully implemented.

### Current Workaround

In the meantime, you can utilize [Class Transformer's @Type](https://github.com/typestack/class-transformer#working-with-nested-objects) decorator for handling nested objects. For example, refer to the [GeoPoint Example](https://github.com/wovalle/fireorm/blob/d8f79090b7006675f2cb5014bb5ca7a9dfbfa8c1/src/BaseFirestoreRepository.spec.ts#L471-L476).

#### Limitations

Currently, casting GeoPoints to a custom class requires `latitude: number` and `longitude: number` as public class fields. This limitation will be addressed in future updates.


## Development

### Initial Setup

1.  Clone the project from github:

```bash
git clone https://github.com/elersong/fireorm24.git
```

2.  Install the dependencies:

```bash
yarn # npm install
```

### Testing

Fireorm has two types of tests:

- Unit tests: `yarn test # or npm test`
- Integration tests: `yarn test:integration # or npm test:integration`

To be able to run the integration tests you need to [create a Firebase service account](https://firebase.google.com/docs/admin/setup#initialize_the_sdk) and declare some [environment variables](https://github.com/wovalle/fireorm/blob/master/test/setup.ts#L5-L13).

Test files must follow the naming convention `*.test.ts` and use [jest](https://jestjs.io/) as the test runner.

### Committing

This repo uses [Conventional Commits](https://www.conventionalcommits.org/) as the commit messages convention.

### Release a new version

This repo uses [Semantic Release](https://github.com/semantic-release/semantic-release) to automatically release new versions as soon as they land on master.

Commits must follow [Angular's Git Commit Guidelines](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines).

Supported commit types (taken from [here](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#type)):

- **feat:** A new feature
- **fix:** A bug fix
- **docs:** Documentation only changes
- **style:** Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **refactor:** A code change that neither fixes a bug nor adds a feature
- **perf:** A code change that improves performance
- **test:** Adding missing or correcting existing tests
- **chore:** Changes to the build process or auxiliary tools and libraries such as documentation generation

<details>
  <summary>Manual Release</summary>
  If, by any reason, a manual release must be done, these are the instructions:

- To release a new version to npm, first we have to create a new tag:

```bash
npm version [ major | minor | patch ] -m "Relasing version"
git push --follow-tags
```

- Then we can publish the package to npm registry:

```bash
npm publish
```

- To deploy the documentation:

```bash
yarn deploy:doc # or npm deploy:doc
```

</details>

### Documentation

- Fireorm uses [typedoc](https://typedoc.org/) to automatically build the API documentation, to generate it:

```bash
yarn build:doc # or npm build:doc
```

Documentation is automatically deployed on each commit to master and is hosted in [Github Pages](https://pages.github.com/) in this [link](https://wovalle.github.io/fireorm).

## Contributing

Have a bug or a feature request? Please visit the [new issues page](https://github.com/elersong/fireorm24/issues) on the FireORM24 repository. To contribute, check the new issues page to find a problem you would like to solve. Additionally, you can review the [old FireORM issues page](https://github.com/wovalle/fireorm/issues) to see if any requested features have not yet been reported to the new repository.

Pull requests are welcome!

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center">
      <a href="http://twitter.com/wovalle">
        <img src="https://avatars0.githubusercontent.com/u/7854116?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>Willy Ovalle</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=wovalle" title="Code">💻</a>
      <a href="https://github.com/wovalle/fireorm/commits?author=wovalle" title="Documentation">📖</a> 
      <a href="#example-wovalle" title="Examples">💡</a> 
      <a href="#ideas-wovalle" title="Ideas, Planning, & Feedback">🤔</a> 
      <a href="https://github.com/wovalle/fireorm/pulls?q=is%3Apr+reviewed-by%3Awovalle" title="Reviewed Pull Requests">👀</a> 
      <a href="https://github.com/wovalle/fireorm/commits?author=wovalle" title="Tests">⚠️</a>
    </td>
    <td align="center">
      <a href="https://github.com/mamodom">
        <img src="https://avatars3.githubusercontent.com/u/5097424?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>Maximo Dominguez</b></sub>
      </a>
      <br />
      <a href="#ideas-mamodom" title="Ideas, Planning, & Feedback">🤔</a>
      <a href="https://github.com/wovalle/fireorm/commits?author=mamodom" title="Code">💻</a>
    </td>
    <td align="center">
      <a href="https://github.com/jonesnc">
        <img src="https://avatars0.githubusercontent.com/u/1293145?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>Nathan Jones</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=jonesnc" title="Code">💻</a>
    </td>
    <td align="center">
      <a href="https://github.com/skalashnyk">
        <img src="https://avatars3.githubusercontent.com/u/18640514?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>Sergii Kalashnyk</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=skalashnyk" title="Code">💻</a>
    </td>
    <td align="center">
      <a href="http://skneko.moe/">
        <img src="https://avatars1.githubusercontent.com/u/13376606?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>SaltyKawaiiNeko</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=skneko" title="Code">💻</a>
      <a href="#ideas-skneko" title="Ideas, Planning, & Feedback">🤔</a>
    </td>
    <td align="center">
      <a href="https://github.com/z-hirschtritt">
        <img src="https://avatars1.githubusercontent.com/u/35265735?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>z-hirschtritt</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=z-hirschtritt" title="Code">💻</a>
      <a href="#ideas-z-hirschtritt" title="Ideas, Planning, & Feedback">🤔</a>
    </td>
    <td align="center">
      <a href="http://joemck.ie/">
        <img src="https://avatars1.githubusercontent.com/u/4980618?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>Joe McKie</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=joemckie" title="Code">💻</a>
      <a href="#ideas-joemckie" title="Ideas, Planning, & Feedback">🤔</a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://www.smddzcy.com/">
        <img src="https://avatars3.githubusercontent.com/u/13895224?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>Samed Düzçay</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=smddzcy" title="Code">💻</a>
    </td>
    <td align="center">
      <a href="https://github.com/stefdelec">
        <img src="https://avatars1.githubusercontent.com/u/12082478?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>stefdelec</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=stefdelec" title="Code">💻</a>
    </td>
    <td align="center">
      <a href="http://www.innvia.com">
        <img src="https://avatars0.githubusercontent.com/u/35846271?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>Łukasz Kuciel</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=LukaszKuciel" title="Code">💻</a>
    </td>
    <td align="center">
      <a href="https://github.com/Fame513">
        <img src="https://avatars1.githubusercontent.com/u/2944505?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>Yaroslav Nekryach</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=Fame513" title="Code">💻</a>
    </td>
    <td align="center">
      <a href="https://www.linkedin.com/in/dmytro-nikitiuk/">
        <img src="https://avatars0.githubusercontent.com/u/40293865?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>Dmytro Nikitiuk</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=tomorroN" title="Code">💻</a>
    </td>
    <td align="center">
      <a href="https://github.com/JingWangTW">
        <img src="https://avatars0.githubusercontent.com/u/20182367?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>JingWangTW</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=JingWangTW" title="Code">💻</a>
    </td>
    <td align="center">
      <a href="https://github.com/rinkstiekema">
        <img src="https://avatars.githubusercontent.com/u/5337711?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>Rink Stiekema</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=rinkstiekema" title="Code">💻</a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://github.com/danieleisenhardt">
        <img src="https://avatars.githubusercontent.com/u/2325519?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>Daniel</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=danieleisenhardt" title="Code">💻</a>
    </td>
    <td align="center">
      <a href="https://zabreznik.net">
        <img src="https://avatars.githubusercontent.com/u/1311249?v=4?s=100" width="100px;" alt=""/>
        <br /><sub><b>Marko Zabreznik</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=MarZab" title="Code">💻</a>
    </td>
    <td align="center">
      <a href="http://jomendez.com">
        <img src="https://avatars.githubusercontent.com/u/8228498?v=4?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>Jose Mendez</b></sub>
      </a>
      <br />
      <a href="https://github.com/wovalle/fireorm/commits?author=jomendez" title="Code">💻</a>
    </td>
    <td align="center">
      <a href="https://github.com/elersong">
        <img src="https://avatars.githubusercontent.com/u/e?email=grey.l.elerson@gmail.com&s=100" width="100px;" alt=""/>
        <br />
        <sub><b>Grey Elerson</b></sub>
      </a>
      <br />
      <a href="https://github.com/elersong/fireorm24/commits?author=elersong" title="Code">💻</a>
      <a href="#ideas-elersong" title="Ideas, Planning, & Feedback">🤔</a>
    </td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## License

MIT © [Willy Ovalle](https://github.com/wovalle) and [Grey Elerson](https://github.com/elersong). See [LICENSE](https://github.com/elersong/fireorm24/blob/master/LICENSE) for details.
