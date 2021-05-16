import inquirer from "inquirer";
import axios from "axios";
import beeper from "beeper";
import chalk from "chalk";


let x={
    st : "",
    ds: "",
    age: "",
    centerName: "",
    stId: "",
    dsId: "",
    date : "05-05-2021",
    vaccine : []
};

//func for getting user input,fetching info from cowin api and then sorting the info accordingly
const getdata = async () => {
      //taking input from user
      inquirer.prompt([
        {
            name: "state_info",
            message: "Please Type your state",
            type: "input"
        },
        {
            name: "district_info",
            message: "Please Type the district from the above mentioned state",
            type: "input"
        },
        {
            name: "center_info",
            message: "Please Type the center's name where vaccine availabilty is to be checked ",
            type: "input"
        },
        {
            name: "age_info",
            message: "Please select your age group",
            type: "rawlist",
            choices: ["18-45 years", "45 years and above"]
        }
    ]).then(function(result) {
        //storing all info in the object x
        x.st = result.state_info;
        x.ds = result.district_info;
        x.centerName = result.center_info;
        if(result.age_info == "18-45 years"){
            x.age = 18;
        }else{
            x.age = 45;
        }
    }).then( async () => {
            //to fetch the state id(for district info) from state name given by user
            const resp = await axios.get('https://www.cowin.gov.in/api/v2/admin/location/states');
            let starray = resp.data.states;
            let reqstateid = await starray.filter(function(e) {
                return e.state_name == x.st;
            })
            x.stId = reqstateid[0].state_id;
       
            //to fetch all the districts(their district id is needed particulary) having vaccination centers in the given state
            const resp2 = await axios.get(`https://www.cowin.gov.in/api/v2/admin/location/districts/${reqstateid[0].state_id}`);
            let dsarray = resp2.data.districts;
            let reqdstid = await dsarray.filter(function(e) {
                return e.district_name == x.ds;
            })
            x.dsId = reqdstid[0].district_id;
            
        }).then(setInterval(async ()=>{

            //to fetch info of all the vaccination centers in the given district
            const resp3 = await axios.get(`https://www.cowin.gov.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${x.dsId}&date=05-05-2021`);
            let vacarray = resp3.data.centers;
            vacarray.forEach((item) => {

                //filtering the centers which have vaccine availability as per the user's input
                let c =  item.sessions.filter(function(e) {
                    return (e.available_capacity > 0 && e.min_age_limit == x.age && e.date === x.date );
                })
                x.vaccine.push({
                    center_name : item.name,
                    center_id : item.center_id,
                    availability : c.length   //total sessions in the particular center having availability for vaccination
                })
            })  
            
            let d = x.vaccine;
            //finally fetching the particular center where user wants to know the vaccine availability
            let ans =  d.filter((j) => {
                return j.center_name == x.centerName;
            })
            //if center has session for vaccination as per user's input info
            if(ans[0].availability > 0){
                console.log(chalk.green.bold(`The vaccines are available at`, chalk.yellow.underline(`${ans[0].center_name} center`) + ` on ${x.date}` ));
                await beeper(3);
            }
            //if the vaccines are not available(i.e zero available sessions of vaccination) for provided user input
            else{
                console.log(chalk.red.bold(`The vaccines are not available at`, chalk.yellow.underline(`${ans[0].center_name} center`) + ` on ${x.date}`));
            }
        },1000*60)).catch((e) => {
        console.log(e) ;
    })
}


getdata();