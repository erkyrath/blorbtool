
export function pretty_size(len: number) : string
{
    if (len < 2000)
        return len + ' bytes';

    let kb = '' + (len / 1000);
    return kb + ' kb';
}
