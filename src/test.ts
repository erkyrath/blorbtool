import { getuser } from './thing';

function greeter(person: string) {
  return "Hello, " + person;
}

export function init() {
    let user: string = getuser();
    document.body.textContent = greeter(user);
}
